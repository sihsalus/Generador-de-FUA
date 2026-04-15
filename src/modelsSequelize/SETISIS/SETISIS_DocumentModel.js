const { DataTypes} = require('sequelize');
import { sequelize } from '../database';



const BaseEntity = require('../BaseEntityModel');

/*
Normal documents should:
- End with a jump line character, without car return (?) (CHAR 10)
- Last line should have also a jump line character
- Every field is separated by |
- Order of the fields (shouldnt be lines?) is given by the order number
- In case of mandatopry documents, should be sent empty if they dont have any info

*/

const SETISIS_DocumentModel = sequelize.define(
    "SETISIS_Document",
    {
        ...BaseEntity.commonAttributes(),
        
        // Document name
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        // Document description
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        // 2 digits - production month (01-12)
        productionMonth: {
            type: DataTypes.STRING(2),
            allowNull: false,
            validate: {
                is: /^(0[1-9]|1[0-2])$/,
            },
        },
        numberOfRegistries: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                isInt: true,
                min: 0,
            },
        },
        FrameVersion: {
            type: DataTypes.STRING,
            allowNull: false,
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