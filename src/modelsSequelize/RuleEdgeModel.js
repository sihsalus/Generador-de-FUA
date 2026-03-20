const { DataTypes } = require('sequelize');
import BaseEntityModel from './BaseEntityModel';
import { sequelize } from './database';

const RuleEdgeModel = sequelize.define(
    "RuleEdge",
    {
        ...BaseEntityModel.commonAttributes(),
        sourceNodeId: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Business nodeId of source node',
        },
        targetNodeId: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Business nodeId of target node',
        },
        edgeOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 1 },
        },
        edgeType: {
            type: DataTypes.ENUM('DEFAULT', 'TRUE', 'FALSE'),
            allowNull: false,
            defaultValue: 'DEFAULT',
            comment: 'Semántica de la arista: DEFAULT=incondicional, TRUE=solo si source es true, FALSE=solo si source es false',
        },
        label: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        sequelize,
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['sourceNodeId', 'targetNodeId', 'RuleId'],
                name: 'unique_edge_per_rule',
            },
        ],
    },
);

export default RuleEdgeModel;
