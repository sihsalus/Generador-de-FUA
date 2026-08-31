import { sequelize } from './database';
const { DataTypes } = require("sequelize");
const BaseEntityModel = require('./BaseEntityModel');

const EntityScriptModel = sequelize.define(
  "EntityScript",
  {
    ...BaseEntityModel.commonAttributes(),
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    scriptContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "script_content",
    },
    targetEntity: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: "target_entity",
    },
    maxChars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2000,
      field: "max_chars",
      validate: { min: 50, max: 50000 },
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
