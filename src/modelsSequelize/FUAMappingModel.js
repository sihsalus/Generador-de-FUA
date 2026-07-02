 import { DataTypes, Model } from 'sequelize';
import { sequelize } from './database';

import { generateHMAC } from './utils';
import { encryptBuffer, decryptBuffer } from '../middleware/dataEncryption';



// Base Entity Inheritance
const BaseEntity = require('./BaseEntityModel');

/*
  Fua Mapping, entity derived from the Base Entity for audit purpouses.
*/

const FUAMappingModel = sequelize.define(
    "FUAMapping",
    {
        //Extending BaseEntity
        ...BaseEntity.commonAttributes(),
        
        // Define FuaFormat atributes
        name: {        // Name of the file
            type: DataTypes.TEXT,
            allowNull: false
        },
        code: {
            type: DataTypes.TEXT,
            allowNull: false
        }        
    },
    {
        sequelize,                  // We need to pass the connection instance,
        timestamps: true,           // Adds createdAt/updatedAt       
    },
);

export default FUAMappingModel;
