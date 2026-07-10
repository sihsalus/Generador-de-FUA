const { DataTypes} = require('sequelize');
import { sequelize } from './database';
import { encryptBuffer, decryptBuffer } from '../middleware/dataEncryption';
import { getRequiredEnvironment } from '../config/runtimeConfig';



// Base Entity Inheritance
const BaseEntity = require('./BaseEntityModel');

function encryptPayload(instance) {
    const payload = instance.getDataValue('payload');
    if (typeof payload !== 'string') {
        return;
    }

    const encryptedPayload = encryptBuffer(
        getRequiredEnvironment('ENCRYPTION_KEY'),
        Buffer.from(payload, 'utf8')
    );
    instance.setDataValue('payload', encryptedPayload.toString('base64'));
}

function decryptPayload(instance) {
    if (!instance || typeof instance.getDataValue !== 'function') {
        return;
    }

    const payload = instance.getDataValue('payload');
    if (typeof payload !== 'string') {
        return;
    }

    try {
        const encryptedPayload = Buffer.from(payload, 'base64');
        if (encryptedPayload.length < 28) {
            return;
        }

        const decryptedPayload = decryptBuffer(
            getRequiredEnvironment('ENCRYPTION_KEY'),
            encryptedPayload
        );
        if (decryptedPayload) {
            instance.setDataValue('payload', decryptedPayload.toString('utf8'));
            instance.changed('payload', false);
        }
    } catch (_error) {
        // Keep payload unchanged if it is not encrypted with this scheme.
    }
}

/*
  Fua From Visit entity derived from the Base Entity for audit purpouses.
*/

const FUAFromVisitModel = sequelize.define(
    "FUAFromVisit",
    {
        //Extending BaseEntity
        ...BaseEntity.commonAttributes(),
        
        // Define FuaFormat atributes
        payload: {        // OpenMRS API payload
            type: DataTypes.TEXT,
            allowNull: false
        },
        schemaType: {        // Shows what type of scheme whas use (HL7, API, Etc)
            type: DataTypes.STRING,
            allowNull: false
        },
        outputType: {
            type: DataTypes.STRING,
            allowNull: false
        },
        output: {
            type: DataTypes.BLOB,
            allowNull: false
        }
        
    },
    {
        sequelize,                  // We need to pass the connection instance,
        timestamps: true,           // Adds createdAt/updatedAt       
        hooks: {
            beforeSave: (instance) => {
                if (instance.changed('payload')) {
                    encryptPayload(instance);
                }
            },
            afterSave: (instance) => {
                decryptPayload(instance);
            },
            afterFind: (result) => {
                if (!result) {
                    return;
                }

                if (Array.isArray(result)) {
                    result.forEach((instance) => decryptPayload(instance));
                    return;
                }

                decryptPayload(result);
            }
        }
    },
);

export default FUAFromVisitModel;
