const { DataTypes } = require('sequelize');
import BaseEntityModel from './BaseEntityModel';
import { sequelize } from './database';

const LookupTableRowModel = sequelize.define(
    "LookupTableRow",
    {
        ...BaseEntityModel.commonAttributes(),
        keyValue: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: 'Valor discriminador. String simple ("301") o objeto compuesto ({"codigo":"301","tipo":"A"})',
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
