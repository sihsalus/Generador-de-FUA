const { DataTypes } = require('sequelize');
import BaseEntityModel from './BaseEntityModel';
import { sequelize } from './database';

const ParameterTemplateModel = sequelize.define(
    "ParameterTemplate",
    {
        ...BaseEntityModel.commonAttributes(),
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Nombre descriptivo del template (ej: "Campo texto requerido 50 chars")',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        paramType: {
            type: DataTypes.ENUM('STRING', 'NUMBER', 'ENUM', 'DATE', 'BOOLEAN', 'RANGE', 'ARRAY'),
            allowNull: false,
            comment: 'Tipo de parámetro que define este template',
        },
        constraints: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {},
            comment: 'Constraints predefinidos reutilizables (ej: {minLength: 1, maxLength: 50})',
        },
        required: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['name', 'RuleSetId'],
                name: 'unique_template_name_per_ruleset',
            },
        ],
    },
);

export default ParameterTemplateModel;
