const { DataTypes} = require('sequelize');
import { sequelize } from '../database';



const BaseEntity = require('../BaseEntityModel');


const SETISIS_FrameMapping = sequelize.define(
    "SETISIS_FrameMapping",
    {
        ...BaseEntity.commonAttributes(),
        // 8 digits - RENIPRESS code assigned to the entity
        renipressCode: {
            type: DataTypes.STRING(8),
            allowNull: false,
            validate: {
                is: /^\d{8}$/,
            },
        },
        // 4 digits - production year
        productionYear: {
            type: DataTypes.STRING(4),
            allowNull: false,
            validate: {
                is: /^\d{4}$/,
            },
        },
        // 2 digits - production month (01-12)
        productionMonth: {
            type: DataTypes.STRING(2),
            allowNull: false,
            validate: {
                is: /^(0[1-9]|1[0-2])$/,
            },
        },
        // 5 digits - shipment number (correlative within month)
        shipmentNumber: {
            type: DataTypes.STRING(5),
            allowNull: false,
            validate: {
                is: /^\d{5}$/,
            },
        },
        filename :{
            type: DataTypes.STRING,
            allowNull: false
        },
        packageData: {
            type: DataTypes.BLOB('long'), 
            allowNull: false
        },  
        versionTag: {
            type: DataTypes.STRING,
            allowNull: false
        },
        versionCounter: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },
    {
        sequelize,                
        timestamps: true,  
    }
);

export default SETISIS_PackageModel;