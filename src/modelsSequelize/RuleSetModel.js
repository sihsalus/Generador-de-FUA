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
            type: DataTypes.ENUM('ALL', 'FIRST_MATCH'),
            allowNull: false,
            defaultValue: 'ALL',
        },
    },
    { sequelize, timestamps: true },
);

export default RuleSetModel;
