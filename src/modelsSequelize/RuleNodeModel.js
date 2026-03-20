const { DataTypes } = require('sequelize');
import BaseEntityModel from './BaseEntityModel';
import { sequelize } from './database';

const RuleNodeModel = sequelize.define(
    "RuleNode",
    {
        ...BaseEntityModel.commonAttributes(),
        nodeId: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Business ID within rule (e.g. N1, G1, P1)',
        },
        nodeType: {
            type: DataTypes.ENUM('CONDITION', 'GATE', 'PARAMETER', 'VALIDATION', 'SUB_RULE'),
            allowNull: false,
        },
        config: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        label: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isEntry: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isDefault: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    },
    {
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['nodeId', 'RuleId'],
                name: 'unique_nodeId_per_rule',
            },
        ],
    },
);

export default RuleNodeModel;
