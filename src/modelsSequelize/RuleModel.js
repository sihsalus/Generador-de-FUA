const { DataTypes } = require('sequelize');
import BaseEntityModel from './BaseEntityModel';
import { sequelize } from './database';

const RuleModel = sequelize.define(
    "Rule",
    {
        ...BaseEntityModel.commonAttributes(),
        ruleNumber: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ruleType: {
            type: DataTypes.ENUM('CONSISTENCY', 'VALIDATION', 'FORMAT', 'BUSINESS'),
            allowNull: false,
        },
        enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 0 },
        },
        weight: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 1.0,
            validate: { min: 0 },
        },
    },
    { sequelize, timestamps: true },
);

export default RuleModel;
