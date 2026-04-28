const CategoryModel = require('../models/CategoryModel');

const serializeCategory = (category) => {
    const data = category.toJSON();
    return {
        ...data,
        _id: data.id,
        user: data.userId,
    };
};

// GET all categories (user's own categories)
module.exports.getCategories = async (req, res) => {
    try {
        const categories = await CategoryModel.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
        });
        console.log('Found categories:', categories.length);
        res.json(categories.map(serializeCategory));
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET single category (user's own)
module.exports.getCategoryById = async (req, res) => {
    try {
        const category = await CategoryModel.findOne({ 
            where: {
                id: req.params.id,
                userId: req.user.id,
            }
        });
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(serializeCategory(category));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST create category (for logged-in user)
module.exports.createCategory = async (req, res) => {
    try {
        console.log('Creating category with data:', req.body);
        console.log('User ID:', req.user.id);
        
        const { name, description, color } = req.body;
        
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
        }
        
        // Create the category - allow duplicate names
        const category = await CategoryModel.create({
            name: name.trim(),
            description: description.trim(),
            color: color || '#667eea',
            userId: req.user.id
        });
        
        console.log('Category created successfully:', category);
        res.status(201).json(serializeCategory(category));
    } catch (error) {
        console.error('Error creating category:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(400).json({ error: error.message });
    }
};

// PUT update category (user's own)
module.exports.updateCategory = async (req, res) => {
    try {
        const [updatedRows] = await CategoryModel.update(
            {
                ...(req.body.name !== undefined ? { name: req.body.name.trim() } : {}),
                ...(req.body.description !== undefined ? { description: req.body.description.trim() } : {}),
                ...(req.body.color !== undefined ? { color: req.body.color } : {}),
            },
            { where: { id: req.params.id, userId: req.user.id } }
        );
        if (!updatedRows) return res.status(404).json({ error: 'Category not found' });
        const category = await CategoryModel.findByPk(req.params.id);
        res.json(serializeCategory(category));
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// DELETE category (user's own)
module.exports.deleteCategory = async (req, res) => {
    try {
        const deletedRows = await CategoryModel.destroy({
            where: {
                id: req.params.id,
                userId: req.user.id,
            }
        });
        if (!deletedRows) return res.status(404).json({ error: 'Category not found' });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
