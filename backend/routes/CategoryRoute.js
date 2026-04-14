const { Router } = require('express');
const {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/CategoryController');
const { authenticate } = require('../middleware/auth');

const router = Router();

// All category routes require authentication - users see only their own categories
router.get('/', authenticate, getCategories);
router.get('/:id', authenticate, getCategoryById);
router.post('/', authenticate, createCategory);
router.put('/:id', authenticate, updateCategory);
router.delete('/:id', authenticate, deleteCategory);

module.exports = router;
