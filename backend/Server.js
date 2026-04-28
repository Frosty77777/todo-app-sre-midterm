const express = require('express');
const cors = require('cors');
const path = require('path');
const client = require('prom-client');
const sequelize = require('./config/database');
const { ToDo } = require('./models');

const todoRoutes = require('./routes/ToDoRoute');
const authRoutes = require('./routes/AuthRoute');
const categoryRoutes = require('./routes/CategoryRoute');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'todo_app_' });

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests by method, route, and status code',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0],
    registers: [register],
});

const todoItemsGauge = new client.Gauge({
    name: 'todo_items_total',
    help: 'Total number of todo items in the database',
    labelNames: ['status'],
    registers: [register],
});

const dbConnectionsGauge = new client.Gauge({
    name: 'postgres_connections_active',
    help: 'Active PostgreSQL connections in Sequelize pool',
    registers: [register],
});

app.use(express.json());

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

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

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

if (process.env.NODE_ENV === 'production') {
    app.use(cors(corsOptions));
} else {
    app.use(cors({
        origin: true,
        credentials: true
    }));
}

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({
            status: 'ok',
            database: 'connected',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    } catch (_) {
        res.status(503).json({
            status: 'degraded',
            database: 'disconnected',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    }
});

app.get('/metrics', async (req, res) => {
    const pool = sequelize.connectionManager.pool;
    dbConnectionsGauge.set(pool?.using || 0);
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/categories', categoryRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res) => {
    if (!req.path.startsWith('/api') && !req.path.includes('.')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

const startServer = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        console.log('✅ Connected to PostgreSQL');

        const updateTodoMetrics = async () => {
            try {
                const [completed, pending] = await Promise.all([
                    ToDo.count({ where: { completed: true } }),
                    ToDo.count({ where: { completed: false } }),
                ]);
                todoItemsGauge.set({ status: 'completed' }, completed);
                todoItemsGauge.set({ status: 'pending' }, pending);
            } catch (_) {}
        };

        await updateTodoMetrics();
        setInterval(updateTodoMetrics, 30_000);

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
        });
    } catch (error) {
        console.error('❌ PostgreSQL connection error:', error.message);
        process.exit(1);
    }
};

startServer();
 