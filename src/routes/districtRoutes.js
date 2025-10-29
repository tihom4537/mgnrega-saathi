const express = require('express');
const router = express.Router();
const districtController = require('../controllers/districtController');
const { query, body, param, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

/**
 * @route   GET /api/districts/states
 * @desc    Get list of all states
 * @access  Public
 */
router.get('/states', districtController.getStatesList);

/**
 * @route   GET /api/districts/financial-years
 * @desc    Get list of financial years
 * @access  Public
 */
router.get('/financial-years', districtController.getFinancialYears);

/**
 * @route   GET /api/districts/list
 * @desc    Get list of districts for a state
 * @access  Public
 */
router.get('/list',
  [
    query('state')
      .notEmpty()
      .withMessage('State is required')
  ],
  validate,
  districtController.getDistrictsList
);

/**
 * @route   GET /api/districts/:districtCode
 * @desc    Get district details with latest performance
 * @access  Public
 */
router.get('/:districtCode',
  [
    param('districtCode')
      .notEmpty()
      .withMessage('District code is required')
      .isLength({ min: 1, max: 20 })
      .withMessage('Invalid district code format')
  ],
  validate,
  districtController.getDistrictDetails
);

/**
 * @route   GET /api/districts
 * @desc    Get district performance data
 * @access  Public
 */
router.get('/',
  [
    query('state')
      .notEmpty()
      .withMessage('State  is required'),
    query('finYear')  // Change from year to finYear
      .notEmpty()
      .withMessage('Financial year is required')
      .matches(/^\d{4}-\d{4}$/)
      .withMessage('Invalid financial year format'),
    query('district')
      .notEmpty()
      .withMessage('Invalid district  format'),
    query('month')
      .optional()
      .isIn(['APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH'])
      .withMessage('Invalid month. Must be uppercase month name')
  ],
  validate,
  districtController.getDistrictData
);

/**
 * @route   GET /api/districts/historical
 * @desc    Get historical data for a district
 * @access  Public
 */
router.get('/historical',
  [
    query('districtCode')
      .notEmpty()
      .withMessage('District code is required'),
    query('years')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Years must be between 1 and 10')
  ],
  validate,
  districtController.getHistoricalData
);

/**
 * @route   GET /api/districts/statistics
 * @desc    Get state-level statistics
 * @access  Public
 */
router.get('/statistics',
  [
    query('stateCode')
      .notEmpty()
      .withMessage('State code is required'),
    query('finYear')
      .notEmpty()
      .withMessage('Financial year is required')
      .matches(/^\d{4}-\d{4}$/)
      .withMessage('Invalid financial year format')
  ],
  validate,
  districtController.getStateStatistics
);

/**
 * @route   GET /api/districts/top-performers
 * @desc    Get top performing districts
 * @access  Public
 */
router.get('/top-performers',
  [
    query('stateCode')
      .notEmpty()
      .withMessage('State code is required'),
    query('finYear')
      .notEmpty()
      .withMessage('Financial year is required')
      .matches(/^\d{4}-\d{4}$/)
      .withMessage('Invalid financial year format'),
    query('metric')
      .optional()
      .isIn([
        'averageDaysEmployment',
        'averageWageRate',
        'totalHouseholdsWorked',
        'totalIndividualsWorked',
        'completedWorks',
        'womenPersondays',
        'totalExpenditure',
        'paymentWithin15Days'
      ])
      .withMessage('Invalid metric'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  validate,
  districtController.getTopPerformers
);

/**
 * @route   POST /api/districts/compare
 * @desc    Compare multiple districts
 * @access  Public
 */
router.post('/compare',
  [
    body('districtCodes')
      .isArray({ min: 2, max: 10 })
      .withMessage('Between 2 and 10 district codes required for comparison'),
    body('districtCodes.*')
      .isString()
      .isLength({ min: 1, max: 20 })
      .withMessage('Invalid district code format'),
    body('finYear')
      .notEmpty()
      .withMessage('Financial year is required')
      .matches(/^\d{4}-\d{4}$/)
      .withMessage('Invalid financial year format')
  ],
  validate,
  districtController.compareDistricts
);

module.exports = router;