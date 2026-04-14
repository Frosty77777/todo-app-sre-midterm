const CategoryModel = require('../models/CategoryModel');

// GET all categories (user's own categories)
module.exports.getCategories = async (req, res) => {
    try {
        console.log('Getting categories for user:', req.user._id);
        const categories = await CategoryModel.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        console.log('Found categories:', categories.length);
        res.json(categories);
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ error: error.message });
    }
};

// GET single category (user's own)
module.exports.getCategoryById = async (req, res) => {
    try {
        const category = await CategoryModel.findOne({ 
            _id: req.params.id, 
            user: req.user._id 
        });
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST create category (for logged-in user)
module.exports.createCategory = async (req, res) => {
    try {
        console.log('Creating category with data:', req.body);
        console.log('User ID:', req.user._id);
        
        const { name, description, color } = req.body;
        
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required' });
        }
        
        // Create the category - allow duplicate names
        const category = await CategoryModel.create({
            name: name.trim(),
            description: description.trim(),
            color: color || '#667eea',
            user: req.user._id
        });
        
        console.log('Category created successfully:', category);
        res.status(201).json(category);
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
        const category = await CategoryModel.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            req.body,
            { new: true }
        );
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(category);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// DELETE category (user's own)
module.exports.deleteCategory = async (req, res) => {
    try {
        const category = await CategoryModel.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.user._id 
        });
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
