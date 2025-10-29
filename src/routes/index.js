const express = require('express');
const router = express.Router();
const districtRoutes = require('./districtRoutes');
// const analyticsRoutes = require('./analyticsRoutes');
// const userRoutes = require('./userRoutes');

// District data routes - Primary feature
router.use('/districts', districtRoutes);

// Analytics routes - Track usage patterns
// router.use('/analytics', analyticsRoutes);

// User preference routes - Save user selections
// router.use('/users', userRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation - Root endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'MGNREGA District Performance Tracker API v1',
    description: 'Production-ready API for tracking MGNREGA program performance across Indian districts',
    version: '1.0.0',
    
    // Recommended usage flow for rural users
    recommendedFlow: {
      step1: 'GET /api/states - Get list of all states',
      step2: 'GET /api/districts/list?stateCode={CODE} - Get districts in selected state',
      step3: 'GET /api/districts/{districtCode}/performance - Get district performance data',
      optional: 'Add query params for comparisons, history, or simplified view'
    },

    endpoints: {
      // ===== TIER 1: Lightweight Metadata (Always Available) =====
      metadata: {
        description: 'Fast, cached endpoints that work even if source API is down',
        GET: {
          '/states': {
            description: 'Get list of all states',
            cached: 'Forever',
            params: 'None',
            example: '/api/states'
          },
          '/districts/list': {
            description: 'Get list of districts in a state',
            cached: '24 hours',
            params: 'stateCode (required)',
            example: '/api/districts/list?stateCode=KL'
          },
          '/financial-years': {
            description: 'Get available financial years',
            cached: '24 hours',
            params: 'None',
            example: '/api/financial-years'
          }
        }
      },

      // ===== TIER 2: District Performance Data (Smart Cached) =====
      performance: {
        description: 'Primary endpoints for district performance data',
        GET: {
          '/districts/:districtCode/performance': {
            description: 'Get complete performance data for a specific district (RECOMMENDED)',
            cached: '24 hours',
            params: {
              path: 'districtCode (required)',
              query: {
                finYear: 'Financial year (optional, defaults to current) e.g., 2024-2025',
                includeComparisons: 'Include state & national averages (optional, default: false)',
                includeHistory: 'Include historical trend data (optional, default: false)',
                simplified: 'Return simplified metrics for low-literacy users (optional, default: false)'
              }
            },
            examples: {
              basic: '/api/districts/KL001/performance',
              withYear: '/api/districts/KL001/performance?finYear=2024-2025',
              withComparisons: '/api/districts/KL001/performance?includeComparisons=true',
              simplified: '/api/districts/KL001/performance?simplified=true',
              complete: '/api/districts/KL001/performance?finYear=2024-2025&includeComparisons=true&includeHistory=true'
            }
          },
          '/districts/:districtCode/summary': {
            description: 'Get simplified summary (optimized for rural users with low bandwidth)',
            cached: '24 hours',
            params: {
              path: 'districtCode (required)',
              query: 'finYear (optional)'
            },
            example: '/api/districts/KL001/summary',
            responseSize: '~5-10 KB (very small)'
          },
          '/districts/:districtCode': {
            description: 'Get district details with latest performance',
            cached: '24 hours',
            params: 'districtCode (path parameter)',
            example: '/api/districts/KL001'
          }
        }
      },

      // ===== Historical & Comparative Analysis =====
      analysis: {
        description: 'Endpoints for historical trends and comparisons',
        GET: {
          '/districts/:districtCode/history': {
            description: 'Get historical performance trends',
            cached: '24 hours',
            params: {
              path: 'districtCode (required)',
              query: 'years (optional, default: 5, max: 10)'
            },
            example: '/api/districts/KL001/history?years=5'
          },
          '/districts/top-performers': {
            description: 'Get top performing districts in a state',
            cached: '24 hours',
            params: {
              stateCode: 'required',
              finYear: 'required',
              metric: 'optional (default: averageDaysEmployment)',
              limit: 'optional (default: 10, max: 50)'
            },
            example: '/api/districts/top-performers?stateCode=KL&finYear=2024-2025&metric=averageDaysEmployment&limit=10'
          },
          '/statistics': {
            description: 'Get state-level aggregated statistics',
            cached: '24 hours',
            params: 'stateCode, finYear (both required)',
            example: '/api/districts/statistics?stateCode=KL&finYear=2024-2025'
          }
        },
        POST: {
          '/districts/compare': {
            description: 'Compare multiple districts side-by-side',
            cached: '24 hours',
            body: {
              districtCodes: 'Array of district codes (2-10 districts)',
              finYear: 'Financial year (required)'
            },
            example: {
              url: '/api/districts/compare',
              body: {
                districtCodes: ['KL001', 'KL002', 'KL003'],
                finYear: '2024-2025'
              }
            }
          }
        }
      },

      // ===== Legacy/Alternative Endpoints =====
      legacy: {
        description: 'Alternative endpoints (use district-specific endpoints instead for better performance)',
        GET: {
          '/districts': {
            description: 'Get all districts performance data (use carefully - large response)',
            deprecated: 'Consider using /districts/:districtCode/performance instead',
            params: 'stateCode, finYear (required), districtCode, month (optional)',
            example: '/api/districts?stateCode=KL&finYear=2024-2025&districtCode=KL001'
          },
          '/districts/historical': {
            description: 'Get historical data (legacy)',
            deprecated: 'Use /districts/:districtCode/history instead',
            params: 'districtCode (required), years (optional)',
            example: '/api/districts/historical?districtCode=KL001&years=5'
          }
        }
      }
    },

    // Response format specifications
    responseFormat: {
      success: {
        success: true,
        data: '{ ... }',
        count: 'number (for lists)',
        timestamp: 'ISO 8601 timestamp',
        dataFreshness: {
          lastUpdated: 'When data was last synced from source',
          isStale: 'Boolean indicating if data is outdated',
          staleWarning: 'Warning message if source API was unavailable'
        }
      },
      error: {
        success: false,
        message: 'Error description',
        error: 'Detailed error (only in development mode)'
      }
    },

    // Data freshness information
    dataSync: {
      frequency: 'Daily at 2:00 AM IST',
      source: 'data.gov.in MGNREGA API',
      fallback: 'Stale data served with warning if source unavailable',
      maxStaleness: '7 days (data older than 7 days shows warning)'
    },

    // Caching policy
    caching: {
      metadata: 'CDN cached permanently (states, districts list)',
      performance: 'Redis cached for 24 hours',
      headers: 'Cache-Control headers set appropriately for CDN/browser caching'
    },

    // Parameters format guide
    parameterFormats: {
      stateCode: 'String (2-10 chars) e.g., "KL", "UP", "MH"',
      districtCode: 'String (max 20 chars) e.g., "KL001", "UP042"',
      finYear: 'String in format YYYY-YYYY e.g., "2024-2025"',
      month: 'Uppercase month name e.g., "JANUARY", "FEBRUARY"'
    },

    // Available metrics for filtering/sorting
    availableMetrics: [
      'averageDaysEmployment',
      'averageWageRate',
      'totalHouseholdsWorked',
      'totalIndividualsWorked',
      'completedWorks',
      'womenPersondays',
      'totalExpenditure',
      'paymentWithin15Days'
    ],

    // Production features
    productionFeatures: {
      rateLimiting: 'Applied per IP address',
      cors: 'Enabled for specified origins',
      compression: 'Gzip/Brotli enabled',
      errorHandling: 'Centralized error handler',
      logging: 'Request/response logging with Winston',
      monitoring: 'Health checks available at /api/health'
    },

    // Support information
    support: {
      documentation: 'https://docs.example.com',
      issues: 'https://github.com/example/mgnrega-tracker/issues',
      email: 'support@example.com'
    }
  });
});

module.exports = router;