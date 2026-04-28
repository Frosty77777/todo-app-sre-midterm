const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ToDo extends Model {}

ToDo.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    priority: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Medium',
        validate: {
            isIn: [['Low', 'Medium', 'High']],
        },
    },
    completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: 'ToDo',
    tableName: 'todos',
    timestamps: true,
});

module.exports = ToDo;
