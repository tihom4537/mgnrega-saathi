require('dotenv').config();

const app = require('./src/app');
const { sequelize } = require('./src/config/database');
const logger = require('./src/utils/logger');

// Import models in dependency order FIRST (parent tables first)
const State = require('./src//models/state');
const FinancialYear = require('./src/models/FinancialYear');
const District = require('./src/models/District');
const DistrictPerformance = require('./src/models/DistrictPerformance');
const DistrictExtendedMetrics = require('./src/models/DistrictExtendedMetrics');

// THEN require the associations file (this sets up the relationships)
require('./src//models/index');

// const cronJobs = require('./src/services/cronJobs');
const PORT = process.env.PORT || 3000;

// Test database connection and sync models
async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // // Sync database models in the correct order
    // await State.sync({ alter: true });
    // await FinancialYear.sync({ alter: true });
    // await District.sync({ alter: true });
    // await DistrictPerformance.sync({ alter: true });
    // await DistrictExtendedMetrics.sync({ alter: true });
    
    logger.info('Database models synchronized.');
    
    // Start cron jobs
    // cronJobs.initializeJobs();
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});