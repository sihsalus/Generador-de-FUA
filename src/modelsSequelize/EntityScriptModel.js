import { sequelize } from './database';
const { DataTypes } = require("sequelize");
const BaseEntityModel = require('./BaseEntityModel');

/**
 * Modelo Sequelize para EntityScript.
 * Almacena scripts JS que transforman entidades usando payloads dinámicos.
 * Hereda atributos de auditoría de BaseEntityModel.
 */
const EntityScriptModel = sequelize.define(
  "EntityScript",
  {
    ...BaseEntityModel.commonAttributes(),
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      comment: "Identificador único del script (ej: actualizar_datos_fua)",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Descripción legible del propósito del script",
    },
    scriptContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "script_content",
      comment: "Código JS — soporta // para líneas opcionales",
    },
    targetEntity: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: "target_entity",
      comment: "Nombre de la entidad objetivo (FUAFormat, Patient, etc.)",
    },
    maxChars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2000,
      field: "max_chars",
      validate: { min: 50, max: 10000 },
    },
    maxTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000,
      field: "max_time_ms",
      validate: { min: 50, max: 5000 },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "entity_scripts",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["target_entity"] },
      { fields: ["name"], unique: true },
    ],
  }
);

export default EntityScriptModel;
