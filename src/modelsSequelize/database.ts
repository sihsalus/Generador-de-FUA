const { Sequelize } = require('sequelize');
import { getDatabaseConfig } from '../config/databaseConfig';

export const sequelize = new Sequelize(getDatabaseConfig());
