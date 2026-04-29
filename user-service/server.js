const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Sequelize, DataTypes, Model } = require('sequelize');
const client = require('prom-client');
require('dotenv').config();

const PORT = process.env.PORT || 5004;
const sequelize = new Sequelize('postgres://todo_user:todo_password@postgres:5432/todo_db', {
    dialect: 'postgres',
    logging: false,
});

class UserProfile extends Model {}
UserProfile.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    displayName: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Guest' },
}, {
    sequelize,
    modelName: 'UserProfile',
    tableName: 'user_profiles',
    timestamps: true,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'user_service_' });
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

app.get('/api/users', async (req, res) => {
    const users = await UserProfile.findAll({ order: [['createdAt', 'DESC']] });
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    try {
        const user = await UserProfile.create({ displayName: req.body.displayName || 'Guest' });
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

io.on('connection', (socket) => {
    socket.emit('chat:system', { message: 'Connected to user-service chat' });
    socket.on('chat:message', (payload) => {
        const message = {
            sender: payload?.sender || 'Anonymous',
            text: payload?.text || '',
            timestamp: new Date().toISOString(),
        };
        io.emit('chat:message', message);
    });
});

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'ok', database: 'connected', service: 'user-service' });
    } catch (_) {
        res.status(503).json({ status: 'degraded', database: 'disconnected', service: 'user-service' });
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
        server.listen(PORT, () => console.log(`user-service running on ${PORT}`));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
