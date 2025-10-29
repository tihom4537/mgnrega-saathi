const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialYear = sequelize.define('FinancialYear', {
  finYear: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    field: 'fin_year'
  },
  startYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'start_year'
  },
  endYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'end_year'
  }
}, {
  tableName: 'financial_years',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['start_year']
    }
  ]
});

module.exports = FinancialYear;