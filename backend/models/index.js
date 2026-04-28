const User = require('./UserModel');
const ToDo = require('./ToDoModel');
const Category = require('./CategoryModel');

User.hasMany(ToDo, { foreignKey: 'userId', as: 'todos', onDelete: 'CASCADE' });
ToDo.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Category, { foreignKey: 'userId', as: 'categories', onDelete: 'CASCADE' });
Category.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Category.hasMany(ToDo, { foreignKey: 'categoryId', as: 'todos', onDelete: 'RESTRICT' });
ToDo.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = {
    User,
    ToDo,
    Category,
};
