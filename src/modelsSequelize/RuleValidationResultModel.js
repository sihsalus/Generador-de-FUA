import { sequelize } from './database';
const { DataTypes } = require('sequelize');
const BaseEntityModel = require('./BaseEntityModel');

/*
  Persiste el resultado consolidado de ejecutar todas las reglas FUA
  sobre un VisitPayload. Un registro por ejecución de validación.
*/
const RuleValidationResultModel = sequelize.define(
    "RuleValidationResult",
    {
        ...BaseEntityModel.commonAttributes(),

        visit_uuid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        allowed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
        // RuleResult[] comprimidos como JSON
        blocks: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '[]',
            get() {
                const raw = this.getDataValue('blocks');
                return raw ? JSON.parse(raw) : [];
            },
            set(value) {
                this.setDataValue('blocks', JSON.stringify(value));
            },
        },
        warnings: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '[]',
            get() {
                const raw = this.getDataValue('warnings');
                return raw ? JSON.parse(raw) : [];
            },
            set(value) {
                this.setDataValue('warnings', JSON.stringify(value));
            },
        },
        enabled_fields: {
            type: DataTypes.TEXT,
            allowNull: false,
            defaultValue: '{}',
            get() {
                const raw = this.getDataValue('enabled_fields');
                return raw ? JSON.parse(raw) : {};
            },
            set(value) {
                this.setDataValue('enabled_fields', JSON.stringify(value));
            },
        },
        // Número de reglas evaluadas en esta ejecución
        rules_evaluated: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        // Tiempo total de ejecución en ms
        execution_time_ms: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        tableName: 'rule_validation_results',
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['visit_uuid'] },
        ],
    }
);

export default RuleValidationResultModel;
