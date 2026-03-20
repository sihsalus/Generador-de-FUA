const { DataTypes } = require('sequelize');
import BaseEntityModel from './BaseEntityModel';
import { sequelize } from './database';

const LookupTableModel = sequelize.define(
    "LookupTable",
    {
        ...BaseEntityModel.commonAttributes(),
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Nombre descriptivo de la tabla (ej: "Rangos por código prestacional")',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        keyField: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: 'Campo(s) del dato como clave de búsqueda. String simple ("codigo") o array compuesto (["codigo","tipo"])',
        },
        columns: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: 'Definición de columnas: [{columnName, targetField, constraintKey, dataType}]',
        },
    },
    {
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['name', 'RuleSetId'],
                name: 'unique_lookup_name_per_ruleset',
            },
        ],
    },
);

export default LookupTableModel;
