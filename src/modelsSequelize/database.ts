const { Sequelize } = require('sequelize');

export const sequelize = new Sequelize(
  {
    database: process.env.DB_USER || 'fuagenerator',
    username: process.env.DB_PASSWORD || 'fuagenerator',
    password: process.env.DB_NAME || 'fuagenerator',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5433',
    dialect:'postgres',
  }
);
