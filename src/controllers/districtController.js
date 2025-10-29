const { State, District, FinancialYear, DistrictPerformance, DistrictExtendedMetrics } = require('../models/index');
const mgnregaApiService = require('../services/mgnregaApiService');
const dataProcessingService = require('../services/dataProcessingService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class DistrictController {
  /**
   * Get district performance data with filters
   * Accepts: state (full name), finYear, optional: districtName, month
   */
  async getDistrictData(req, res) {
    try {
      const { state, district, finYear, month } = req.query;

      if (!state || !finYear) {
        return res.status(400).json({
          success: false,
          message: 'State name and financial year are required parameters'
        });
      }

      // Helper function to build where clause
      const buildWhereClause = async (finYear, month, district, stateCode, stateName) => {
        const whereClause = { finYear };
        
        if (month) {
          whereClause.month = month.toUpperCase();
        }
        
        if (district) {
          let districtRecord = await District.findOne({
            where: {
              districtName: { [Op.like]: district.toUpperCase() },
              stateCode
            }
          });
          
          // If district not found in DB, try fetching from API
          if (!districtRecord) {
            logger.info(`District '${district}' not found in DB for state '${stateName}'. Attempting to fetch from API...`);
            
            try {
              // FIXED: Pass stateName (not undefined) to the API service
              const apiData = await mgnregaApiService.fetchDistrictData({
                stateName: stateName,  // This was missing/undefined before
                finYear: finYear,
                districtName: district
              });
              
              if (apiData && apiData.length > 0) {
                logger.info(`Found ${apiData.length} records for district '${district}' from API. Processing...`);
                await dataProcessingService.processAndStoreDataBulk(apiData);
                
                // Try to find the district again after processing
                districtRecord = await District.findOne({
                  where: {
                    districtName: { [Op.like]: district.toUpperCase() },
                    stateCode
                  }
                });
                
                if (districtRecord) {
                  logger.info(`Successfully created district '${district}' in database`);
                }
              } else {
                logger.warn(`No data found for district '${district}' in API`);
              }
            } catch (apiError) {
              logger.error(`Failed to fetch district '${district}' from API:`, apiError);
            }
          }
          
          if (districtRecord) {
            whereClause.districtCode = districtRecord.districtCode;
          } else {
            return null; // District not found even after API fetch
          }
        }
        
        return whereClause;
      };

      // Helper function to fetch performance data
      const fetchPerformanceData = async (whereClause, stateCode) => {
        return await DistrictPerformance.findAll({
          where: whereClause,
          include: [
            {
              model: District,
              as: 'district',
              where: { stateCode },
              include: [
                {
                  model: State,
                  as: 'state',
                  attributes: ['stateCode', 'stateName']
                }
              ]
            },
            {
              model: FinancialYear,
              as: 'financialYear',
              attributes: ['finYear', 'startYear', 'endYear']
            },
            {
              model: DistrictExtendedMetrics,
              as: 'extendedMetrics',
              required: false
            }
          ],
          order: [['month', 'DESC'], ['updated_at', 'DESC']]
        });
      };

      // Step 1: Find state by name (case-insensitive)
      let stateRecord = await State.findOne({
        where: { 
          stateName: {
            [Op.like]: state.toUpperCase()
          }
        }
      });

      // Step 2: If state not found in DB, fetch from API and store
      if (!stateRecord) {
        logger.info(`State '${state}' not found in DB. Fetching from external API...`);
        
        try {
          const apiData = await mgnregaApiService.fetchDistrictData({
            stateName: state,
            finYear: finYear,
            districtName: district
          });

          if (!apiData || apiData.length === 0) {
            logger.warn(`No data returned from API for state='${state}', finYear='${finYear}', district='${district || 'all'}'`);
            
            // Try with a known working year (2023-2024 or 2022-2023)
            const fallbackYears = ['2023-2024', '2022-2023', '2021-2022'];
            let fallbackData = null;
            
            for (const fallbackYear of fallbackYears) {
              logger.info(`Trying fallback year: ${fallbackYear}`);
              try {
                fallbackData = await mgnregaApiService.fetchDistrictData({
                  stateName: state,
                  finYear: fallbackYear,
                  districtName: null // Get all districts for state
                });
                
                if (fallbackData && fallbackData.length > 0) {
                  logger.info(`Successfully fetched data for ${fallbackYear}`);
                  await dataProcessingService.processAndStoreDataBulk(fallbackData);
                  break;
                }
              } catch (fallbackError) {
                logger.warn(`Fallback year ${fallbackYear} also failed`);
              }
            }

            // If we got fallback data, the state should now exist
            stateRecord = await State.findOne({
              where: { 
                stateName: {
                  [Op.like]: state.toUpperCase()
                }
              }
            });

            if (!stateRecord) {
              return res.status(404).json({
                success: false,
                message: `State '${state}' not found and no data available from external API. Please check the state name or try a different financial year (2022-2023, 2023-2024).`,
                suggestions: {
                  availableYears: fallbackYears,
                  note: 'Data for 2024-2025 may not be available yet in the external API'
                }
              });
            }

            // State exists but no data for requested year
            return res.status(404).json({
              success: false,
              message: `No data found for state '${state}' and financial year '${finYear}'. Data may not be available for this year yet.`,
              suggestions: {
                state: stateRecord.stateName,
                stateCode: stateRecord.stateCode,
                requestedYear: finYear,
                availableYears: 'Try 2022-2023 or 2023-2024'
              }
            });
          }

          // Process and store data (this will create state, districts, and performance records)
          await dataProcessingService.processAndStoreDataBulk(apiData);

          // Now fetch the state record that was just created
          stateRecord = await State.findOne({
            where: { 
              stateName: {
                [Op.like]: state.toUpperCase()
              }
            }
          });

        } catch (apiError) {
          logger.error('Error fetching from external API:', apiError);
          return res.status(503).json({
            success: false,
            message: 'Unable to fetch data from external source. The external API may be unavailable or rate-limiting requests.',
            error: process.env.NODE_ENV === 'development' ? apiError.message : undefined,
            suggestion: 'Please try again later or check if the data exists in our database for a different year'
          });
        }
      }

      if (!stateRecord) {
        return res.status(404).json({
          success: false,
          message: `State '${state}' not found`
        });
      }

      // FIXED: Pass the stateName to buildWhereClause
      const whereClause = await buildWhereClause(
        finYear, 
        month, 
        district, 
        stateRecord.stateCode,
        stateRecord.stateName  // This ensures stateName is passed correctly
      );

      // Check if district was provided but not found
      if (district && whereClause === null) {
        return res.status(404).json({
          success: false,
          message: `District '${district}' not found in state '${state}'`,
          suggestion: `Use GET /api/v1/districts/list?state=${state} to see available districts`
        });
      }

      // Step 4: Fetch performance data with associations
      let data = await fetchPerformanceData(whereClause, stateRecord.stateCode);

      // Step 5: If still no data, try fetching from API again
      if (!data || data.length === 0) {
        logger.info(`No performance data found in DB for ${state} ${finYear}. Fetching fresh data from API...`);
        
        try {
          const apiData = await mgnregaApiService.fetchDistrictData({
            stateName: state,
            finYear: finYear,
            districtName: district
          });

          if (apiData && apiData.length > 0) {
            await dataProcessingService.processAndStoreDataBulk(apiData);
            
            // FIXED: Rebuild where clause with stateName
            const refetchWhereClause = await buildWhereClause(
              finYear, 
              month, 
              district, 
              stateRecord.stateCode,
              stateRecord.stateName  // Pass stateName here too
            );
            
            // Check if district was provided but still not found after API fetch
            if (district && refetchWhereClause === null) {
              return res.status(404).json({
                success: false,
                message: `District '${district}' not found in state '${state}' even after fetching from API`,
                suggestion: `Use GET /api/v1/districts/list?state=${state} to see available districts`
              });
            }
            
            // Refetch from DB with proper filter
            data = await fetchPerformanceData(refetchWhereClause, stateRecord.stateCode);
          } else {
            logger.warn(`API returned no data for ${state} ${finYear}`);
          }
        } catch (apiError) {
          logger.error('Error fetching fresh data:', apiError);
          // Continue with empty data rather than failing
        }
      }

      // Step 6: Calculate performance metrics and return response
      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No performance data found for the specified criteria`,
          query: {
            state: state,
            finYear: finYear,
            district: district || 'all',
            month: month || 'all'
          },
          suggestions: {
            message: 'Try a different financial year or check available districts',
            getDistricts: `/api/v1/districts/list?state=${state}`,
            tryYears: ['2022-2023', '2023-2024']
          }
        });
      }

      // Calculate performance metrics
      const processedData = data.map(item => {
        const itemJson = item.toJSON();
        return {
          ...itemJson,
          performanceScore: itemJson.extendedMetrics?.performanceScore || 
                           dataProcessingService.calculatePerformanceScore(item),
          performanceGrade: dataProcessingService.getPerformanceGrade(item)
        };
      });

      return res.status(200).json({
        success: true,
        data: processedData,
        count: processedData.length,
        timestamp: new Date().toISOString(),
        dataFreshness: {
          lastUpdated: data[0]?.updated_at || new Date(),
          source: 'database'
        }
      });

    } catch (error) {
      logger.error('Error in getDistrictData:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch district data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }



  /**
   * Get historical data for a specific district
   */
  async getHistoricalData(req, res) {
    try {
      const { districtName, state, years = 5 } = req.query;

      if (!districtName || !state) {
        return res.status(400).json({
          success: false,
          message: 'District name and state name are required'
        });
      }

      // Find state
      const stateRecord = await State.findOne({
        where: { 
          stateName: { [Op.like]: state.toUpperCase() }
        }
      });

      if (!stateRecord) {
        return res.status(404).json({
          success: false,
          message: `State '${state}' not found`
        });
      }

      // Find district
      const districtRecord = await District.findOne({
        where: {
          districtName: { [Op.like]: districtName.toUpperCase() },
          stateCode: stateRecord.stateCode
        }
      });

      if (!districtRecord) {
        return res.status(404).json({
          success: false,
          message: `District '${districtName}' not found in state '${state}'`
        });
      }

      // Get current financial year
      const currentFinYear = await FinancialYear.findOne({
        where: { isCurrent: true }
      });

      if (!currentFinYear) {
        return res.status(404).json({
          success: false,
          message: 'Current financial year not found'
        });
      }

      // Generate list of financial years
      const yearsList = [];
      const startYear = parseInt(currentFinYear.finYear.split('-')[0]);
      for (let i = 0; i < years; i++) {
        const year = startYear - i;
        yearsList.push(`${year}-${year + 1}`);
      }

      const data = await DistrictPerformance.findAll({
        where: {
          districtCode: districtRecord.districtCode,
          finYear: { [Op.in]: yearsList }
        },
        include: [
          {
            model: District,
            as: 'district',
            include: [
              {
                model: State,
                as: 'state',
                attributes: ['stateCode', 'stateName']
              }
            ]
          },
          {
            model: FinancialYear,
            as: 'financialYear'
          },
          {
            model: DistrictExtendedMetrics,
            as: 'extendedMetrics',
            required: false
          }
        ],
        order: [['finYear', 'DESC'], ['month', 'DESC']]
      });

      // Group by year for trend analysis
      const trendData = dataProcessingService.generateTrendData(data);

      res.json({
        success: true,
        data: data,
        trends: trendData,
        count: data.length
      });

    } catch (error) {
      logger.error('Error in getHistoricalData:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch historical data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get aggregated state statistics
   */
  async getStateStatistics(req, res) {
    try {
      const { state, finYear } = req.query;

      if (!state || !finYear) {
        return res.status(400).json({
          success: false,
          message: 'State name and financial year are required'
        });
      }

      // Find state
      const stateRecord = await State.findOne({
        where: { 
          stateName: { [Op.like]: state.toUpperCase() }
        }
      });

      if (!stateRecord) {
        return res.status(404).json({
          success: false,
          message: `State '${state}' not found`
        });
      }

      const statistics = await dataProcessingService.calculateStateStatistics(
        stateRecord.stateCode, 
        finYear
      );

      res.json({
        success: true,
        data: {
          state: stateRecord.stateName,
          stateCode: stateRecord.stateCode,
          finYear: finYear,
          ...statistics
        }
      });

    } catch (error) {
      logger.error('Error in getStateStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch state statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get top performing districts based on a metric
   */
  async getTopPerformers(req, res) {
    try {
      const { state, finYear, metric = 'averageDaysEmployment', limit = 10 } = req.query;

      if (!state || !finYear) {
        return res.status(400).json({
          success: false,
          message: 'State name and financial year are required'
        });
      }

      // Find state
      const stateRecord = await State.findOne({
        where: { 
          stateName: { [Op.like]: state.toUpperCase() }
        }
      });

      if (!stateRecord) {
        return res.status(404).json({
          success: false,
          message: `State '${state}' not found`
        });
      }

      const data = await DistrictPerformance.findAll({
        include: [
          {
            model: District,
            as: 'district',
            where: { stateCode: stateRecord.stateCode },
            include: [
              {
                model: State,
                as: 'state',
                attributes: ['stateCode', 'stateName']
              }
            ]
          },
          {
            model: FinancialYear,
            as: 'financialYear',
            where: { finYear: finYear }
          }
        ],
        order: [[metric, 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: data,
        metric: metric,
        count: data.length
      });

    } catch (error) {
      logger.error('Error in getTopPerformers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch top performers',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Compare multiple districts
   */
  async compareDistricts(req, res) {
    try {
      const { districtNames, state, finYear } = req.body;

      if (!districtNames || !Array.isArray(districtNames) || districtNames.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 district names required for comparison'
        });
      }

      if (!state || !finYear) {
        return res.status(400).json({
          success: false,
          message: 'State name and financial year are required'
        });
      }

      // Find state
      const stateRecord = await State.findOne({
        where: { 
          stateName: { [Op.like]: state.toUpperCase() }
        }
      });

      if (!stateRecord) {
        return res.status(404).json({
          success: false,
          message: `State '${state}' not found`
        });
      }

      // Find districts
      const districts = await District.findAll({
        where: {
          districtName: { 
            [Op.in]: districtNames.map(d => d.toUpperCase()) 
          },
          stateCode: stateRecord.stateCode
        }
      });

      const districtCodes = districts.map(d => d.districtCode);

      const data = await DistrictPerformance.findAll({
        where: {
          districtCode: { [Op.in]: districtCodes },
          finYear: finYear
        },
        include: [
          {
            model: District,
            as: 'district',
            include: [
              {
                model: State,
                as: 'state'
              }
            ]
          },
          {
            model: FinancialYear,
            as: 'financialYear'
          },
          {
            model: DistrictExtendedMetrics,
            as: 'extendedMetrics',
            required: false
          }
        ]
      });

      const comparison = dataProcessingService.generateComparison(data);

      res.json({
        success: true,
        data: comparison,
        count: data.length
      });

    } catch (error) {
      logger.error('Error in compareDistricts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare districts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get list of districts for a state
   */
  async getDistrictsList(req, res) {
    try {
      const { state } = req.query;

      if (!state) {
        return res.status(400).json({
          success: false,
          message: 'State name is required'
        });
      }

      // Find state
      const stateRecord = await State.findOne({
        where: { 
          stateName: { [Op.like]: state.toUpperCase() }
        }
      });

      // If state not found in DB, fetch from API directly
      if (!stateRecord) {
        logger.info(`State '${state}' not found in DB. Fetching from external API...`);
        
        
        try {
          const apiDistricts = await mgnregaApiService.fetchDistrictsList(state);

          console.log('trying the ultimate method');
          console.log(apiDistricts);
          
          if (!apiDistricts || apiDistricts.length === 0) {
            return res.status(404).json({
              success: false,
              message: `No districts found for state '${state}'`
            });
          }

          return res.json({
            success: true,
            data: apiDistricts,
            count: apiDistricts.length,
            source: 'api'
          });

        } catch (apiError) {
          logger.error('Error fetching from external API:', apiError);
          return res.status(503).json({
            success: false,
            message: 'Unable to fetch data from external source. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? apiError.message : undefined
          });
        }
      }

      // Fetch districts from DB
      const districts = await District.findAll({
        where: { stateCode: stateRecord.stateCode },
        include: [
          {
            model: State,
            as: 'state',
            attributes: ['stateCode', 'stateName']
          }
        ],
        order: [['districtName', 'ASC']]
      });

      // If no districts in DB, fetch from API
      if (!districts || districts.length === 0) {
        try {
          console.log('trying the fetchDistricrList');
          const apiDistricts = await mgnregaApiService.fetchDistrictsList(state);
          console.log(apiDistricts);
          
          return res.json({
            success: true,
            data: apiDistricts,
            count: apiDistricts.length,
            source: 'api'
          });
        } catch (apiError) {
          logger.error('Error fetching districts from API:', apiError);
          return res.status(503).json({
            success: false,
            message: 'Unable to fetch districts data',
            error: process.env.NODE_ENV === 'development' ? apiError.message : undefined
          });
        }
      }

      res.json({
        success: true,
        data: districts,
        count: districts.length,
        source: 'database'
      });

    } catch (error) {
      logger.error('Error in getDistrictsList:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch districts list',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get list of all states
   */
  async getStatesList(req, res) {
    try {
      // const states = await State.findAll({
      //   attributes: ['stateCode', 'stateName', 'isActive'],
      //   where: { isActive: true },
      //   order: [['stateName', 'ASC']]
      // });

      // If no states in DB, fetch from API
      // if (!states || states.length === 0) {
        
        const apiStates = await mgnregaApiService.fetchStatesList();
        
        res.json({
          success: true,
          data: apiStates,
          count: apiStates.length,
          source: 'api'
        });
      //   return;
      // }

      // res.json({
      //   success: true,
      //   data: states,
      //   count: states.length,
      //   source: 'database'
      // });

    } catch (error) {
      logger.error('Error in getStatesList:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch states list',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get financial years list
   */
  async getFinancialYears(req, res) {
    try {
      const financialYears = await FinancialYear.findAll({
        order: [['finYear', 'DESC']]
      });

      res.json({
        success: true,
        data: financialYears,
        count: financialYears.length
      });

    } catch (error) {
      logger.error('Error in getFinancialYears:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch financial years',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get district details with latest performance
   */
  async getDistrictDetails(req, res) {
    try {
      const { districtName } = req.params;
      const { state } = req.query;

      if (!districtName || !state) {
        return res.status(400).json({
          success: false,
          message: 'District name and state name are required'
        });
      }

      // Find state
      const stateRecord = await State.findOne({
        where: { 
          stateName: { [Op.like]: state.toUpperCase() }
        }
      });

      if (!stateRecord) {
        return res.status(404).json({
          success: false,
          message: `State '${state}' not found`
        });
      }

      // Find district
      const district = await District.findOne({
        where: {
          districtName: { [Op.like]: districtName.toUpperCase() },
          stateCode: stateRecord.stateCode
        },
        include: [
          {
            model: State,
            as: 'state'
          },
          {
            model: DistrictPerformance,
            as: 'performances',
            include: [
              {
                model: FinancialYear,
                as: 'financialYear'
              },
              {
                model: DistrictExtendedMetrics,
                as: 'extendedMetrics',
                required: false
              }
            ],
            limit: 12, // Last 12 months
            order: [['finYear', 'DESC'], ['month', 'DESC']]
          }
        ]
      });

      if (!district) {
        return res.status(404).json({
          success: false,
          message: `District '${districtName}' not found in state '${state}'`
        });
      }

      res.json({
        success: true,
        data: district
      });

    } catch (error) {
      logger.error('Error in getDistrictDetails:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch district details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new DistrictController();