const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const District = sequelize.define('District', {
  districtCode: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    field: 'district_code'
  },
  districtName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'district_name'
  },
  stateCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    field: 'state_code',
    references: {
      model: 'states',
      key: 'state_code'
    }
  }
}, {
  tableName: 'districts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['state_code']
    },
    {
      fields: ['district_name']
    }
  ]
});

module.exports = District;