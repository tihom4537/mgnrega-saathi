const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const State = sequelize.define('State', {
  stateCode: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    field: 'state_code'
  },
  stateName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'state_name'
  }
}, {
  tableName: 'states',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['state_name']
    }
  ]
});

module.exports = State;