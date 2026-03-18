import { Sequelize } from 'sequelize';

// Import all entities


import Visit from './VisitModel';
import User from './User';

import FUAFromVisitModel from './FUAFromVisitModel';
import FUAFromVisitPDFModel from './FUAFromVisitPDFModel';

import BaseEntityVersionModel from "./BaseEntityVersionModel.js";
import BaseEntityVersion_MiddleTableModel from './BaseEntityVersion_MiddleTableModel.js';
import FUAFormatFromSchemaModel from './FUAFormatFromSchemaModel';


// Foreign keys
/*
FUAFormat.hasMany(FUAPage, {
    foreignKey: {
        name: 'FUAFormatId',
        allowNull: false,
    }    
});
FUAPage.belongsTo(FUAFormat);

FUAPage.hasOne(FUAPage, { foreignKey: 'nextPage' });
FUAPage.hasOne(FUAPage, { foreignKey: 'previousPage' });

FUAPage.hasMany(FUASection, {
    foreignKey: {
        name: 'FUAPageId',
        allowNull: false,
    }
});
FUASection.belongsTo(FUAPage);

FUASection.hasMany(FUAField, {
    foreignKey: {
        name: 'FUASectionId',
        allowNull: false,
    }
});
FUAField.belongsTo(FUASection);

FUAField.hasMany(FUAFieldColumn, {
    foreignKey: {
        name: 'FUAFieldId',
        allowNull: false,
    }
});
FUAFieldColumn.belongsTo(FUAField);

FUAFieldColumn.hasMany(FUAFieldRow, {
    foreignKey: {
        name: 'FUAFieldColumnId',
        allowNull: false,
    }
});
FUAFieldRow.belongsTo(FUAFieldColumn);

FUAFieldRow.hasMany(FUAFieldCell, {
    foreignKey: {
        name: 'FUAFieldRowId',
        allowNull: false,
    }
});
FUAFieldCell.belongsTo(FUAFieldRow);

FUAFieldCell.hasMany(FUAField, {
    foreignKey: {
        name: 'FUAFieldCellId',
    }
});
FUAField.belongsTo(FUAFieldCell);
*/

// FK of FUAFromVisit with FUAFormatFromSchema
FUAFormatFromSchemaModel.hasMany( FUAFromVisitModel,{
    foreignKey: {
        name: 'FUAFormatFromSchemaId',
        allowNull: false,
    }
});
FUAFromVisitModel.belongsTo( FUAFormatFromSchemaModel );

BaseEntityVersionModel.belongsToMany(BaseEntityVersionModel, { 
    as: 'VersioningRelation',    
    through: BaseEntityVersion_MiddleTableModel,
    foreignKey: 'mainEntity',
    otherKey: 'relatedEntity', // FK in the join table pointing to the related model
    allowNull: true,
});

FUAFromVisitModel.hasMany( FUAFromVisitPDFModel, {
    foreignKey: {
        name: 'FUAFromVisitModelId',
        allowNull: false,
    }   
});
//FUAFromVisitPDFModel.belongsTo( FUAFromVisitModel );


BaseEntityVersionModel.hasOne( FUAFromVisitPDFModel, {
    foreignKey: {
        name: 'BaseEntityVersionModelId',
        allowNull: false
    }
});
//FUAFromVisitPDFModel.belongsTo( BaseEntityVersionModel );


//Exports
export {    
    User,
    Visit,
    FUAFromVisitModel,
    FUAFromVisitPDFModel,
    BaseEntityVersionModel,
    BaseEntityVersion_MiddleTableModel
};
