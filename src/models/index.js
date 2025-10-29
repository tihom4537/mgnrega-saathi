const { sequelize } = require('../config/database');
const State = require('./state');
const District = require('./District');
const FinancialYear = require('./FinancialYear');
const DistrictPerformance = require('./DistrictPerformance');
const DistrictExtendedMetrics = require('./DistrictExtendedMetrics');
// const DistrictDataArchive = require('./DistrictDataArchive');

// Define Associations
State.hasMany(District, {
  foreignKey: 'stateCode',
  sourceKey: 'stateCode',
  as: 'districts'
});

District.belongsTo(State, {
  foreignKey: 'stateCode',
  targetKey: 'stateCode',
  as: 'state'
});

District.hasMany(DistrictPerformance, {
  foreignKey: 'districtCode',
  sourceKey: 'districtCode',
  as: 'performances'
});

DistrictPerformance.belongsTo(District, {
  foreignKey: 'districtCode',
  targetKey: 'districtCode',
  as: 'district'
});

FinancialYear.hasMany(DistrictPerformance, {
  foreignKey: 'finYear',
  sourceKey: 'finYear',
  as: 'performances'
});

DistrictPerformance.belongsTo(FinancialYear, {
  foreignKey: 'finYear',
  targetKey: 'finYear',
  as: 'financialYear'
});

DistrictPerformance.hasOne(DistrictExtendedMetrics, {
  foreignKey: 'performanceId',
  sourceKey: 'id',
  as: 'extendedMetrics'
});

DistrictExtendedMetrics.belongsTo(DistrictPerformance, {
  foreignKey: 'performanceId',
  targetKey: 'id',
  as: 'performance'
});

// REMOVE THIS - DistrictDataArchive is not imported
// DistrictPerformance.hasOne(DistrictDataArchive, {
//   foreignKey: 'performanceId',
//   sourceKey: 'id',
//   as: 'archive'
// });

// Export all models and sequelize instance
module.exports = {
  sequelize,
  State,
  District,
  FinancialYear,
  DistrictPerformance,
  DistrictExtendedMetrics,
  // DistrictDataArchive
};