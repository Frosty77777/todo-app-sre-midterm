const API_BASE = '/api';
const API = {
    auth: `${API_BASE}/auth`,
    orders: `${API_BASE}/orders`,
    products: `${API_BASE}/products`,
    users: `${API_BASE}/users`,
};

let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let socket;

const authButtons = document.getElementById('auth-buttons');
const userInfo = document.getElementById('user-info');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const authModal = document.getElementById('auth-modal');
const closeModal = document.querySelector('.close');
const todoFormSection = document.getElementById('todo-form-section');
const welcomeSection = document.getElementById('welcome-section');
const todosSection = document.getElementById('todos-section');
const chatSection = document.getElementById('chat-section');
const todoForm = document.getElementById('todo-form');
const todosList = document.getElementById('todos-list');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const productSelect = document.getElementById('productId');

let isLoginMode = true;

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuth();
});

function setupEventListeners() {
    if (logoutBtn) logoutBtn.onclick = logout;
    if (closeModal) closeModal.onclick = () => authModal.style.display = 'none';
    if (todoForm) todoForm.onsubmit = handleTaskSubmit;
    if (chatForm) chatForm.onsubmit = sendChatMessage;
    window.onclick = (e) => {
        if (e.target && e.target.id === 'auth-modal') authModal.style.display = 'none';
    };
}

function checkAuth() {
    if (token && user) {
        showAuthenticatedUI();
        loadProducts();
        loadTasks();
        connectChat();
    } else {
        showUnauthenticatedUI();
    }
}

function showAuthModal(login) {
    isLoginMode = login;
    document.getElementById('modal-title').textContent = login ? 'Login' : 'Register';
    document.getElementById('auth-submit').textContent = login ? 'Login' : 'Register';
    authModal.style.display = 'block';
    document.getElementById('auth-form').reset();
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    if (!email || !password) return showError('Please enter both email and password');

    const endpoint = isLoginMode ? '/login' : '/register';
    const res = await fetch(API.auth + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || 'Authentication failed');

    token = data.token;
    user = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    authModal.style.display = 'none';
    showAuthenticatedUI();
    await loadProducts();
    await loadTasks();
    connectChat();
}

function logout() {
    token = null;
    user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socket) socket.disconnect();
    showUnauthenticatedUI();
}

function showAuthenticatedUI() {
    authButtons.style.display = 'none';
    userInfo.style.display = 'block';
    userEmail.textContent = user.email;
    welcomeSection.style.display = 'none';
    todoFormSection.style.display = 'block';
    todosSection.style.display = 'block';
    chatSection.style.display = 'block';
}

function showUnauthenticatedUI() {
    authButtons.style.display = 'block';
    userInfo.style.display = 'none';
    welcomeSection.style.display = 'block';
    todoFormSection.style.display = 'none';
    todosSection.style.display = 'none';
    chatSection.style.display = 'none';
    todosList.innerHTML = '';
}

async function loadProducts() {
    const res = await fetch(API.products);
    const products = await res.json();
    productSelect.innerHTML = '<option value="">Select product</option>' + products.map(
        (p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`
    ).join('');
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    if (!token || !user) return showError('Login required');

    const status = document.getElementById('priority').value;
    const productId = productSelect.value;
    if (!productId) return showError('Please choose a product');
    const taskData = {
        userId: user.id,
        productId,
        status,
    };

    try {
        console.log('Sending task...', taskData);
        const res = await fetch(API.orders, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(taskData),
        });
        const data = await res.json();
        if (!res.ok) return showError(data.error || 'Failed to add task');

        todoForm.reset();
        await fetchTasks();
        // Explicitly clear task controls after submission.
        productSelect.value = '';
        const prioritySelect = document.getElementById('priority');
        if (prioritySelect) prioritySelect.value = '';
    } catch (error) {
        console.error('Error details:', error);
        showError(error.message || 'Failed to add task');
    }
}

async function fetchTasks() {
    await loadTasks();
}

async function loadTasks() {
    if (!token) return;
    loading.style.display = 'block';
    try {
        const res = await fetch(API.orders, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const tasks = await res.json();
        renderTasks(tasks);
    } catch (error) {
        showError(error.message);
    } finally {
        loading.style.display = 'none';
    }
}

function renderTasks(tasks) {
    if (!tasks.length) {
        todosList.innerHTML = '<p class="empty-message">No Task yet.</p>';
        return;
    }
    todosList.innerHTML = tasks.map((task) => `
        <div class="todo-card">
            <h4>Task: ${escapeHtml(task.status)}</h4>
            <p>Product: ${escapeHtml(task.productId)}</p>
            <p>User: ${escapeHtml(task.userId)}</p>
        </div>
    `).join('');
}

function connectChat() {
    socket = io(window.location.origin);
    socket.on('chat:system', (payload) => appendChat('System', payload.message));
    socket.on('chat:message', (payload) => appendChat(payload.sender, payload.text));
}

function sendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !socket) return;
    socket.emit('chat:message', {
        sender: user?.email || 'Anonymous',
        text,
    });
    input.value = '';
}

function appendChat(sender, text) {
    const item = document.createElement('div');
    item.textContent = `${sender}: ${text}`;
    chatMessages.appendChild(item);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = 'block';
    setTimeout(() => { errorMessage.style.display = 'none'; }, 4000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.showAuthModalDirect = showAuthModal;
window.handleAuthDirect = handleAuth;