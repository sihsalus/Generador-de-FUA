import { sequelize } from './database';
const {  DataTypes, Model } = require('sequelize');


/*
  Base Entity entity that holds atributes for audit purpouses.
*/

const BaseEntityVersion_MiddleTableModel = sequelize.define(
  "BaseEntityVersion_MiddleTable",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    }, 
  },
  {
    sequelize,          // We need to pass the connection instance,
    timestamps: true,   // Adds createdAt/updatedAt
  },
);

export default BaseEntityVersion_MiddleTableModel;


