const { Router } = require('express');
const { getToDo, getToDoById, saveToDo, updateToDo, deleteToDo } = require('../controllers/ToDoController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = Router();

// All routes require authentication - users see and manage only their own todos
router.get('/', authenticate, getToDo);
router.get('/:id', authenticate, getToDoById);

// All users can create, update, delete their own todos
router.post('/', authenticate, saveToDo);
router.put('/:id', authenticate, updateToDo);
router.delete('/:id', authenticate, deleteToDo);

module.exports = router;