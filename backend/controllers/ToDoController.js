const ToDoModel = require('../models/ToDoModel');
const CategoryModel = require('../models/CategoryModel');

const serializeTodo = (todo) => {
    const data = todo.toJSON();
    const serializedCategory = data.category
        ? {
            ...data.category,
            _id: data.category.id,
        }
        : null;

    return {
        ...data,
        _id: data.id,
        user: data.userId,
        category: serializedCategory || data.categoryId,
    };
};

// GET all todos (for logged-in user only)
module.exports.getToDo = async (req, res) => {
    try {
        // Only get todos for the logged-in user
        const todos = await ToDoModel.findAll({
            where: { userId: req.user.id },
            include: [{ model: CategoryModel, as: 'category', attributes: ['id', 'name', 'description', 'color'] }],
            order: [['createdAt', 'DESC']],
        });
        return res.json(todos.map(serializeTodo));
    } catch (error) {
        console.error('Error loading todos:', error);
        return res.status(500).json({ error: error.message || 'Failed to load todos' });
    }
};

// GET single todo by ID (user's own todos only)
module.exports.getToDoById = async (req, res) => {
    try {
        const todo = await ToDoModel.findOne({
            where: {
                id: req.params.id,
                userId: req.user.id,
            },
            include: [{ model: CategoryModel, as: 'category', attributes: ['id', 'name', 'description', 'color'] }],
        });
        if (!todo) return res.status(404).json({ error: 'ToDo not found' });
        res.json(serializeTodo(todo));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST create new todo (for logged-in user)
module.exports.saveToDo = async (req, res) => {
    try {
        const { title, description, priority, completed, category } = req.body;
        
        // Verify category belongs to the user
        const categoryDoc = await CategoryModel.findOne({
            where: {
                id: category,
                userId: req.user.id,
            }
        });
        
        if (!categoryDoc) {
            return res.status(400).json({ error: 'Category not found or does not belong to you' });
        }
        
        // Create todo with user ID and validated category
        const todo = await ToDoModel.create({
            title,
            description,
            priority: priority || 'Medium',
            completed: completed ?? false,
            categoryId: category,
            userId: req.user.id
        });

        const createdTodo = await ToDoModel.findByPk(todo.id, {
            include: [{ model: CategoryModel, as: 'category', attributes: ['id', 'name', 'description', 'color'] }],
        });
        res.status(201).json(serializeTodo(createdTodo));
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
            const categoryDoc = await CategoryModel.findOne({
                where: {
                    id: category,
                    userId: req.user.id,
                }
            });
            
            if (!categoryDoc) {
                return res.status(400).json({ error: 'Category not found or does not belong to you' });
            }
        }
        
        const [updatedRows] = await ToDoModel.update(
            {
                ...(title !== undefined ? { title } : {}),
                ...(description !== undefined ? { description } : {}),
                ...(priority !== undefined ? { priority } : {}),
                ...(completed !== undefined ? { completed } : {}),
                ...(category !== undefined ? { categoryId: category } : {}),
            },
            {
                where: { id: req.params.id, userId: req.user.id },
            }
        );
        
        if (!updatedRows) return res.status(404).json({ error: 'ToDo not found' });

        const todo = await ToDoModel.findByPk(req.params.id, {
            include: [{ model: CategoryModel, as: 'category', attributes: ['id', 'name', 'description', 'color'] }],
        });
        res.json(serializeTodo(todo));
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// DELETE todo (user's own todos only)
module.exports.deleteToDo = async (req, res) => {
    try {
        const deletedRows = await ToDoModel.destroy({
            where: {
                id: req.params.id,
                userId: req.user.id,
            }
        });
        if (!deletedRows) return res.status(404).json({ error: 'ToDo not found' });
        res.json({ message: 'ToDo deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};