const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, Model } = require('sequelize');
const client = require('prom-client');
require('dotenv').config();

const PORT = process.env.PORT || 5003;

// Incident-simulation ready DB config from separate env vars.
// 1. Заменяем блок создания sequelize (хардкодим URL)
const sequelize = new Sequelize('postgres://todo_user:todo_password@postgres:5432/todo_db', {
    dialect: 'postgres',
    logging: false,
});

// 2. Исправляем модель Order
class Order extends Model {}
Order.init({
    // ОЧЕНЬ ВАЖНО: меняем id с UUID на STRING
    id: { 
        type: DataTypes.STRING, 
        primaryKey: true,
        defaultValue: () => Math.random().toString(36).substr(2, 9) 
    },
    userId: { type: DataTypes.STRING, allowNull: false },
    productId: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
}, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
});

const app = express();
app.use(cors());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'order_service_' });
const requests = new client.Counter({
    name: 'http_requests_total',
    help: 'Total requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});
app.use((req, res, next) => {
    res.on('finish', () => {
        requests.inc({ method: req.method, route: req.path, status_code: String(res.statusCode) });
    });
    next();
});

// Task-compatible aliases to keep existing UX/API expectations.
app.get('/api/orders', async (req, res) => {
    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
    const tasks = orders.map((order) => {
        const data = order.toJSON();
        return {
            ...data,
            _id: data.id,
            title: data.status,
            description: `Product ${data.productId}`,
            category: 'orders',
            priority: 'Medium',
            completed: data.status === 'completed',
        };
    });
    res.json(tasks);
});

app.get('/api/orders/:id', async (req, res) => {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const data = order.toJSON();
    res.json({
        ...data,
        _id: data.id,
        title: data.status,
        description: `Product ${data.productId}`,
        category: 'orders',
        priority: 'Medium',
        completed: data.status === 'completed',
    });
});

app.post('/api/orders', async (req, res) => {
    try {
        const { userId, productId, status } = req.body;
        const order = await Order.create({
            userId,
            productId,
            status: status || 'pending',
        });
        const data = order.toJSON();
        res.status(201).json({
            ...data,
            _id: data.id,
            title: data.status,
            description: `Product ${data.productId}`,
            category: 'orders',
            priority: 'Medium',
            completed: data.status === 'completed',
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    const [updated] = await Order.update(req.body, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    const order = await Order.findByPk(req.params.id);
    const data = order.toJSON();
    res.json({
        ...data,
        _id: data.id,
        title: data.status,
        description: `Product ${data.productId}`,
        category: 'orders',
        priority: 'Medium',
        completed: data.status === 'completed',
    });
});

app.delete('/api/orders/:id', async (req, res) => {
    const deleted = await Order.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
});

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'ok', database: 'connected', service: 'order-service' });
    } catch (_) {
        res.status(503).json({ status: 'degraded', database: 'disconnected', service: 'order-service' });
    }
});

app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
});

(async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        app.listen(PORT, () => console.log(`order-service running on ${PORT}`));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
