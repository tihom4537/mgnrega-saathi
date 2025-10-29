const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DistrictExtendedMetrics = sequelize.define('DistrictExtendedMetrics', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  performanceId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true,
    field: 'performance_id',
    references: {
      model: 'district_performance',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  // Worker Statistics
  totalWorkers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_workers'
  },
  totalActiveWorkers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_active_workers'
  },
  totalJobcardsIssued: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_jobcards_issued'
  },
  totalActiveJobcards: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_active_jobcards'
  },
  scWorkersActive: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sc_workers_active'
  },
  stWorkersActive: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'st_workers_active'
  },
  differentlyAbledWorked: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'differently_abled_worked'
  },
  
  // Work Category Percentages
  percentNrmExpenditure: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'percent_nrm_expenditure'
  },
  percentCategoryBWorks: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'percent_category_b_works'
  },
  percentAgricultureAllied: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'percent_agriculture_allied'
  },
  
  // Additional Financial
  totalAdminExpenditure: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'total_admin_expenditure'
  },
  materialSkilledWages: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'material_skilled_wages'
  },
  
  // Liability
  persondaysCentralLiability: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'persondays_central_liability'
  },
  
  // Work Statistics
  totalWorksTakenup: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_works_takenup'
  },
  gpsWithNilExp: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'gps_with_nil_exp'
  }
}, {
  tableName: 'district_extended_metrics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = DistrictExtendedMetrics;
