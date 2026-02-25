import { Sequelize } from 'sequelize';

// Import all entities


import Visit from './VisitModel';
import User from './User';

import FUAFormat from './FUAFormatModel';
import FUAPage from './FUAPageModel';
import FUASection from './FUASectionModel'; 
import FUAField from './FUAFieldModel';
import FUAFieldColumn from './FUAFieldColumn';
import FUAFieldRow from './FUAFieldRow';
import FUAFieldCell from './FUAFieldCell';

import FUAFromVisitModel from './FUAFromVisitModel';
import FUAFromVisitPDFModel from './FUAFromVisitPDFModel';

import BaseEntityVersionModel from "./BaseEntityVersionModel.js";
import BaseEntityVersion_MiddleTableModel from './BaseEntityVersion_MiddleTableModel.js';
import FUAFormatFromSchemaModel from './FUAFormatFromSchemaModel';

import RuleSet  from './RuleSetModel';
import Rule     from './RuleModel';
import RuleNode from './RuleNodeModel';
import RuleEdge from './RuleEdgeModel';

// ── Relaciones FK de Validacion──

// RuleSet 1:N Rule
RuleSet.hasMany(Rule, { 
    foreignKey: { 
        name: 'RuleSetId', 
        allowNull: false 
    } 
});
Rule.belongsTo(RuleSet);

// Rule 1:N RuleNode
Rule.hasMany(RuleNode, { 
    foreignKey: { 
        name: 'RuleId', 
        allowNull: false 
    } 
});
RuleNode.belongsTo(Rule);

// Rule 1:N RuleEdge
Rule.hasMany(RuleEdge, { 
    foreignKey: { 
        name: 'RuleId', 
        allowNull: false 
    } 
});
RuleEdge.belongsTo(Rule);

// Foreign keys

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
    RuleSet,
    Rule,
    RuleNode,
    RuleEdge,    
    User,
    Visit,
    FUAFormat,
    FUAPage,
    FUASection,
    FUAField,
    FUAFieldColumn,
    FUAFieldRow,
    FUAFieldCell,
    FUAFromVisitModel,
    FUAFromVisitPDFModel,
    BaseEntityVersionModel,
    BaseEntityVersion_MiddleTableModel
};
