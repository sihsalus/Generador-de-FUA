const { DataTypes } = require('sequelize');
import BaseEntityModel from './BaseEntityModel';
import { sequelize } from './database';

const RuleSetModel = sequelize.define(
    "RuleSet",
    {
        ...BaseEntityModel.commonAttributes(),
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        documentType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        evaluationMode: {
            type: DataTypes.ENUM('ALL', 'FIRST_VALID', 'ANY', 'MAJORITY', 'WEIGHTED', 'REPORT'),
            allowNull: false,
            defaultValue: 'ALL',
        },
        threshold: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: 0.5,
        },
    },
    { sequelize, timestamps: true },
);

export default RuleSetModel;
