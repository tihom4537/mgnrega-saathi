// src/config/database.js
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'mgnrega_tracker',
  process.env.DB_USER || 'mgnrega_user',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // Remove dialectOptions.collate - it's causing the warning
    dialectOptions: {
      charset: 'utf8mb4'
      // collate is not a valid option here - it should be set at database/table level
    },
    timezone: '+05:30', // Indian timezone
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci', // Set collation in define instead
      timestamps: true
    }
  }
);

// Test the connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MySQL Database connected successfully');
    logger.info(`Connected to: ${process.env.DB_NAME || 'mgnrega_tracker'}`);
    
    // Sync models in development (be careful in production!)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false }); // Change to { alter: true } if you want to update tables
      logger.info('Database synced');
    }
  } catch (error) {
    logger.error('Unable to connect to the database:', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };