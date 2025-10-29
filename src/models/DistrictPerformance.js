const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DistrictPerformance = sequelize.define('DistrictPerformance', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  districtCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'district_code',
    references: {
      model: 'districts',
      key: 'district_code'
    }
  },
  finYear: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'fin_year',
    references: {
      model: 'financial_years',
      key: 'fin_year'
    }
  },
  month: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'month'
  },
  
  // Key Performance Metrics
  approvedLabourBudget: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'approved_labour_budget'
  },
  averageWageRate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'average_wage_rate'
  },
  averageDaysEmployment: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'average_days_employment'
  },
  totalHouseholdsWorked: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_households_worked'
  },
  totalIndividualsWorked: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_individuals_worked'
  },
  
  // Work Statistics
  completedWorks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'completed_works'
  },
  ongoingWorks: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'ongoing_works'
  },
  
  // Person-days Data
  womenPersondays: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    field: 'women_persondays'
  },
  scPersondays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sc_persondays'
  },
  stPersondays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'st_persondays'
  },
  
  // Financial Data
  totalExpenditure: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'total_expenditure'
  },
  wages: {
    type: DataTypes.BIGINT,
    defaultValue: 0,
    field: 'wages'
  },
  
  // Achievement Metrics
  households100Days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'households_100_days'
  },
  paymentWithin15Days: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    field: 'payment_within_15_days'
  },
  
  // Performance Score
  performanceScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'performance_score'
  },
  performanceGrade: {
    type: DataTypes.STRING(5),
    field: 'performance_grade'
  }
}, {
  tableName: 'district_performance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      name: 'uk_district_year_month',
      fields: ['district_code', 'fin_year', 'month']
    },
    {
      name: 'idx_fin_year_month',
      fields: ['fin_year', 'month']
    },
    {
      name: 'idx_district_year',
      fields: ['district_code', 'fin_year']
    },
    {
      name: 'idx_performance_score',
      fields: ['performance_score']
    },
    {
      name: 'idx_created_at',
      fields: ['created_at']
    }
  ]
});

module.exports = DistrictPerformance;