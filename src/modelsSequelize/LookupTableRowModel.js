const { DataTypes } = require('sequelize');
import BaseEntityModel from './BaseEntityModel';
import { sequelize } from './database';

const LookupTableRowModel = sequelize.define(
    "LookupTableRow",
    {
        ...BaseEntityModel.commonAttributes(),
        keyValue: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Valor discriminador (ej: "301", "302")',
        },
        values: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: 'Valores de constraints: {columnName: value, ...}',
        },
    },
    {
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['keyValue', 'LookupTableId'],
                name: 'unique_key_per_lookup',
            },
        ],
    },
);

export default LookupTableRowModel;
