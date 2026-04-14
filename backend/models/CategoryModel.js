const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: '#667eea'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Allow duplicate category names - removed unique constraint
// Users can have multiple categories with the same name if they want

// Remove any old global unique index on name if it exists
// We'll handle this in the controller instead

module.exports = mongoose.model('Category', CategorySchema);
