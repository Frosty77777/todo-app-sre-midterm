const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes, Model } = require('sequelize');
const client = require('prom-client');
require('dotenv').config();

const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const sequelize = new Sequelize('postgres://todo_user:todo_password@postgres:5432/todo_db', {
    dialect: 'postgres',
    logging: false,
});

class User extends Model {
    async comparePassword(password) {
        return bcrypt.compare(password, this.password);
    }
}

User.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'user' },
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
});

User.beforeCreate(async (user) => {
    user.password = await bcrypt.hash(user.password, 10);
});

User.beforeUpdate(async (user) => {
    if (user.changed('password')) user.password = await bcrypt.hash(user.password, 10);
});

const app = express();
app.use(cors());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'auth_service_' });
const requests = new client.Counter({
    name: 'http_requests_total',
    help: 'Total requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

app.use((req, res, next) => {
    res.on('finish', () => {
        requests.inc({
            method: req.method,
            route: req.path,
            status_code: String(res.statusCode),
        });
    });
    next();
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const existing = await User.findOne({ where: { email: email.toLowerCase() } });
        if (existing) return res.status(400).json({ error: 'User already exists' });

        const user = await User.create({ email: email.toLowerCase(), password, role: 'user' });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email: email?.toLowerCase() } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await user.comparePassword(password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'ok', database: 'connected', service: 'auth-service' });
    } catch (error) {
        res.status(503).json({ status: 'degraded', database: 'disconnected', service: 'auth-service' });
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
        app.listen(PORT, () => console.log(`auth-service running on ${PORT}`));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
