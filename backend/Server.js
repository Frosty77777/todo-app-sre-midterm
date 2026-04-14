const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const client = require('prom-client');
 
const todoRoutes = require('./routes/ToDoRoute');
const authRoutes = require('./routes/AuthRoute');
const categoryRoutes = require('./routes/CategoryRoute');
 
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log("MONGODB_URL =", process.env.MONGODB_URL);
 
const app = express();
const PORT = process.env.PORT || 5000;
 
// ─── Prometheus Setup ──────────────────────────────────────────────────────────
const register = new client.Registry();
 
// Стандартные метрики Node.js (heap, GC, event loop и т.д.)
client.collectDefaultMetrics({ register, prefix: 'todo_app_' });
 
// Метрика 1 — счётчик запросов (для SLI: доступность / error rate)
const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests by method, route, and status code',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});
 
// Метрика 2 — гистограмма времени ответа (для SLI: latency / P95)
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0],
    registers: [register],
});
 
// Метрика 3 — количество todo items (бизнес-метрика)
const todoItemsGauge = new client.Gauge({
    name: 'todo_items_total',
    help: 'Total number of todo items in the database',
    labelNames: ['status'],
    registers: [register],
});
 
// Метрика 4 — MongoDB connections
const dbConnectionsGauge = new client.Gauge({
    name: 'mongodb_connections_active',
    help: 'Active MongoDB connections',
    registers: [register],
});
// ──────────────────────────────────────────────────────────────────────────────
 
app.use(express.json());
 
// ─── Prometheus Middleware (оборачивает каждый запрос) ─────────────────────────
app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
        const route = req.route?.path
            ? `${req.baseUrl || ''}${req.route.path}`
            : req.path;
        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };
        end(labels);
        httpRequestsTotal.inc(labels);
    });
    next();
});
// ──────────────────────────────────────────────────────────────────────────────
 
// CORS Configuration - Allows frontend to make requests
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // List of allowed origins
        const allowedOrigins = [
            'http://localhost',           
            'http://localhost:80',
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            process.env.FRONTEND_URL,
            'https://to-do-app-rrmj.onrender.com'
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};
 
// Use CORS - allow all in development, use options in production
if (process.env.NODE_ENV === 'production') {
    app.use(cors(corsOptions));
} else {
    app.use(cors({
        origin: true,
        credentials: true
    }));
}
 
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log('✅ Connected to MongoDB');
 
        // Обновляем todo метрики каждые 30 секунд
        const updateTodoMetrics = async () => {
            try {
                const ToDo = require('./models/ToDoModel');
                const [completed, pending] = await Promise.all([
                    ToDo.countDocuments({ completed: true }),
                    ToDo.countDocuments({ completed: false }),
                ]);
                todoItemsGauge.set({ status: 'completed' }, completed);
                todoItemsGauge.set({ status: 'pending' }, pending);
            } catch (_) {}
        };
        updateTodoMetrics();
        setInterval(updateTodoMetrics, 30_000);
    })
    .catch(err => console.error('❌ MongoDB error:', err.message));
 
// ─── System Endpoints ──────────────────────────────────────────────────────────
 
// Health check — используется Docker healthcheck
app.get('/health', (req, res) => {
    const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        status: 'ok',
        database: dbState[mongoose.connection.readyState] || 'unknown',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});
 
// Metrics endpoint — Prometheus scrapes this every 15s
app.get('/metrics', async (req, res) => {
    dbConnectionsGauge.set(mongoose.connections.length);
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
});
// ──────────────────────────────────────────────────────────────────────────────
 
// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/categories', categoryRoutes);
 
// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));
 
// Serve frontend HTML for non-API routes (catch-all must be last)
app.use((req, res) => {
    if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});
 
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
});
 