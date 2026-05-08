const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, Model } = require('sequelize');
const client = require('prom-client');
require('dotenv').config();

const PORT = process.env.PORT || 5002;
const DATABASE_URL = process.env.DATABASE_URL;

function validateConfig() {
    if (!DATABASE_URL) {
        throw new Error('Missing required environment variable: DATABASE_URL');
    }
    if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
        throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
    }
}

const sequelize = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
            });
class Product extends Model {}
Product.init({
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    name: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    price: { 
        type: DataTypes.FLOAT, 
        allowNull: false 
    },
    description: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
}, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
});


const app = express();
app.use(cors());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'product_service_' });
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

app.get('/api/products', async (req, res) => {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.json(products);
});

app.get('/api/products/:id', async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
});

app.post('/api/products', async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const [updated] = await Product.update(req.body, { where: { id: req.params.id } });
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    const product = await Product.findByPk(req.params.id);
    res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
    const deleted = await Product.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
});

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'ok', database: 'connected', service: 'product-service' });
    } catch (_) {
        res.status(503).json({ status: 'degraded', database: 'disconnected', service: 'product-service' });
    }
});

app.get('/metrics', async (req, res) => {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
});

(async () => {
    try {
        validateConfig();
        console.log('Waiting 10 seconds for DB and Env...');
        await new Promise(resolve => setTimeout(resolve, 10000));


        // "Привязываем" модель к созданному подключению
        Product.init({
            id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
            name: { type: DataTypes.STRING, allowNull: false },
            price: { type: DataTypes.FLOAT, allowNull: false },
            description: { type: DataTypes.STRING, allowNull: false },
        }, {
            sequelize, // передаем созданный выше объект
            modelName: 'Product',
            tableName: 'products'
        });

        await sequelize.authenticate();
        console.log('Connected to Database');

        await sequelize.sync({ force: true });
        await Product.bulkCreate([
            { name: 'Low Complexity', price: 1, description: 'Quick tasks, minor fixes' },
            { name: 'Medium Complexity', price: 5, description: 'Standard feature development' },
            { name: 'High Complexity', price: 13, description: 'Complex architecture or urgent bugs' }
        ]);

        app.listen(PORT, () => console.log(`product-service running on ${PORT}`));
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
})();

