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
