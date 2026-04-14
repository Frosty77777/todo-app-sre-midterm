const ToDoModel = require('../models/ToDoModel');

// GET all todos (for logged-in user only)
module.exports.getToDo = async (req, res) => {
    try {
        // Only get todos for the logged-in user
        const todos = await ToDoModel.find({ user: req.user._id })
            .populate('category', 'name description color')
            .sort({ createdAt: -1 });
        return res.json(todos);
    } catch (error) {
        console.error('Error loading todos:', error);
        return res.status(500).json({ error: error.message || 'Failed to load todos' });
    }
};

// GET single todo by ID (user's own todos only)
module.exports.getToDoById = async (req, res) => {
    try {
        const todo = await ToDoModel.findOne({ 
            _id: req.params.id, 
            user: req.user._id 
        }).populate('category', 'name description color');
        if (!todo) return res.status(404).json({ error: 'ToDo not found' });
        res.json(todo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST create new todo (for logged-in user)
module.exports.saveToDo = async (req, res) => {
    try {
        const { title, description, priority, completed, category } = req.body;
        
        // Verify category belongs to the user
        const CategoryModel = require('../models/CategoryModel');
        const categoryDoc = await CategoryModel.findOne({ 
            _id: category, 
            user: req.user._id 
        });
        
        if (!categoryDoc) {
            return res.status(400).json({ error: 'Category not found or does not belong to you' });
        }
        
        // Create todo with user ID and validated category
        const todo = await ToDoModel.create({
            title,
            description,
            priority: priority || 'Medium',
            completed: false,
            category,
            user: req.user._id
        });
        
        // Populate category for response
        await todo.populate('category', 'name description color');
        res.status(201).json(todo);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// PUT update todo (user's own todos only)
module.exports.updateToDo = async (req, res) => {
    try {
        const { title, description, priority, completed, category } = req.body;
        
        // If category is being updated, verify it belongs to the user
        if (category) {
            const CategoryModel = require('../models/CategoryModel');
            const categoryDoc = await CategoryModel.findOne({ 
                _id: category, 
                user: req.user._id 
            });
            
            if (!categoryDoc) {
                return res.status(400).json({ error: 'Category not found or does not belong to you' });
            }
        }
        
        const todo = await ToDoModel.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { title, description, priority, completed, category },
            { new: true, runValidators: true }
        ).populate('category', 'name description color');
        
        if (!todo) return res.status(404).json({ error: 'ToDo not found' });
        res.json(todo);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// DELETE todo (user's own todos only)
module.exports.deleteToDo = async (req, res) => {
    try {
        const todo = await ToDoModel.findOneAndDelete({ 
            _id: req.params.id, 
            user: req.user._id 
        });
        if (!todo) return res.status(404).json({ error: 'ToDo not found' });
        res.json({ message: 'ToDo deleted successfully' });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        res.status(500).json({ error: error.message });
    }
};