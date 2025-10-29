const { State, District, FinancialYear, DistrictPerformance, DistrictExtendedMetrics } = require('../models/index');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class DataProcessingService {
  
  /**
   * OPTIMIZED: Process API data with bulk operations
   */
  async processAndStoreDataBulk(apiData) {
    const transaction = await sequelize.transaction();
    
    try {
      // STEP 1: Bulk process all unique states
      const uniqueStates = this.extractUniqueStates(apiData);
      await this.bulkUpsertStates(uniqueStates, transaction);

      // STEP 2: Bulk process all unique districts
      const uniqueDistricts = this.extractUniqueDistricts(apiData);
      await this.bulkUpsertDistricts(uniqueDistricts, transaction);

      // STEP 3: Bulk process all unique financial years
      const uniqueFinYears = this.extractUniqueFinYears(apiData);
      await this.bulkUpsertFinancialYears(uniqueFinYears, transaction);

      // STEP 4: Bulk upsert performance data
      const performanceRecords = this.preparePerformanceRecords(apiData);
      const insertedPerformances = await this.bulkUpsertPerformance(performanceRecords, transaction);

      // STEP 5: Bulk upsert extended metrics
      await this.bulkUpsertExtendedMetrics(insertedPerformances, apiData, transaction);

      await transaction.commit();
      logger.info(`Successfully processed ${apiData.length} records in bulk`);
      return insertedPerformances;

    } catch (error) {
      await transaction.rollback();
      logger.error('Error in bulk processing:', error);
      throw error;
    }
  }

  /**
   * Extract unique states from API data
   */
  extractUniqueStates(apiData) {
    const statesMap = new Map();
    
    apiData.forEach(record => {
      const stateName = record.state_name?.toUpperCase() || '';
      if (!statesMap.has(stateName)) {
        statesMap.set(stateName, {
          stateCode: record.state_code || this.generateStateCode(record.state_name),
          stateName: stateName
        });
      }
    });

    return Array.from(statesMap.values());
  }

  /**
   * Extract unique districts from API data
   */
  extractUniqueDistricts(apiData) {
    const districtsMap = new Map();
    
    apiData.forEach(record => {
      const stateCode = record.state_code || this.generateStateCode(record.state_name);
      const districtCode = record.district_code || this.generateDistrictCode(record.district_name, stateCode);
      
      if (!districtsMap.has(districtCode)) {
        districtsMap.set(districtCode, {
          districtCode: districtCode,
          districtName: record.district_name?.toUpperCase() || '',
          stateCode: stateCode
        });
      }
    });

    return Array.from(districtsMap.values());
  }

  /**
   * Extract unique financial years from API data
   */
  extractUniqueFinYears(apiData) {
    const finYearsMap = new Map();
    
    apiData.forEach(record => {
      const finYear = record.fin_year || '';
      if (!finYearsMap.has(finYear)) {
        const fyData = this.parseFinancialYear(finYear);
        finYearsMap.set(finYear, {
          finYear: finYear,
          startYear: fyData.startYear,
          endYear: fyData.endYear
        });
      }
    });

    return Array.from(finYearsMap.values());
  }

  /**
   * Bulk upsert states
   */
  async bulkUpsertStates(states, transaction) {
    if (states.length === 0) return;

    await State.bulkCreate(states, {
      updateOnDuplicate: ['stateName'],
      transaction,
      ignoreDuplicates: false
    });

    logger.info(`Bulk processed ${states.length} states`);
  }

  /**
   * Bulk upsert districts
   */
  async bulkUpsertDistricts(districts, transaction) {
    if (districts.length === 0) return;

    await District.bulkCreate(districts, {
      updateOnDuplicate: ['districtName', 'stateCode'],
      transaction,
      ignoreDuplicates: false
    });

    logger.info(`Bulk processed ${districts.length} districts`);
  }

  /**
   * Bulk upsert financial years
   */
  async bulkUpsertFinancialYears(finYears, transaction) {
    if (finYears.length === 0) return;

    await FinancialYear.bulkCreate(finYears, {
      updateOnDuplicate: ['startYear', 'endYear'],
      transaction,
      ignoreDuplicates: false
    });

    logger.info(`Bulk processed ${finYears.length} financial years`);
  }

  /**
   * Prepare performance records from API data
   */
  preparePerformanceRecords(apiData) {
    return apiData.map(record => {
      const stateCode = record.state_code || this.generateStateCode(record.state_name);
      const districtCode = record.district_code || this.generateDistrictCode(record.district_name, stateCode);
      
      return {
        districtCode: districtCode,
        finYear: record.fin_year || '',
        month: record.month?.toUpperCase() || null,
        approvedLabourBudget: parseInt(record.Approved_Labour_Budget) || 0,
        averageWageRate: parseFloat(record.Average_Wage_rate_per_day_per_person) || 0,
        averageDaysEmployment: parseFloat(record.Average_days_of_employment_provided_per_Household) || 0,
        totalHouseholdsWorked: parseInt(record.Total_Households_Worked) || 0,
        totalIndividualsWorked: parseInt(record.Total_Individuals_Worked) || 0,
        completedWorks: parseInt(record.Number_of_Completed_Works) || 0,
        ongoingWorks: parseInt(record.Number_of_Ongoing_Works) || 0,
        womenPersondays: parseFloat(record.Women_Persondays) || 0,
        scPersondays: parseInt(record.SC_persondays) || 0,
        stPersondays: parseInt(record.ST_persondays) || 0,
        totalExpenditure: parseInt(record.Total_Exp) || 0,
        wages: parseInt(record.Wages) || 0,
        households100Days: parseInt(record.Total_No_of_HHs_completed_100_Days_of_Wage_Employment) || 0,
        paymentWithin15Days: parseFloat(record.percentage_payments_gererated_within_15_days) || 0
      };
    });
  }

  /**
   * Bulk upsert performance records using ON DUPLICATE KEY UPDATE
   */
  async bulkUpsertPerformance(performanceRecords, transaction) {
    if (performanceRecords.length === 0) return [];

    // Use bulkCreate with updateOnDuplicate for upsert behavior
    const result = await DistrictPerformance.bulkCreate(performanceRecords, {
      updateOnDuplicate: [
        'approvedLabourBudget', 'averageWageRate', 'averageDaysEmployment',
        'totalHouseholdsWorked', 'totalIndividualsWorked', 'completedWorks',
        'ongoingWorks', 'womenPersondays', 'scPersondays', 'stPersondays',
        'totalExpenditure', 'wages', 'households100Days', 'paymentWithin15Days'
      ],
      transaction,
      returning: true // Get inserted records back
    });

    logger.info(`Bulk upserted ${performanceRecords.length} performance records`);
    return result;
  }

  /**
   * Alternative: Manual bulk upsert using raw SQL (even faster for large datasets)
   */
  async bulkUpsertPerformanceRaw(performanceRecords, transaction) {
    if (performanceRecords.length === 0) return [];

    // Build raw SQL INSERT ... ON DUPLICATE KEY UPDATE
    const values = performanceRecords.map(record => 
      `(${sequelize.escape(record.districtCode)}, ${sequelize.escape(record.finYear)}, ` +
      `${sequelize.escape(record.month)}, ${record.approvedLabourBudget}, ` +
      `${record.averageWageRate}, ${record.averageDaysEmployment}, ` +
      `${record.totalHouseholdsWorked}, ${record.totalIndividualsWorked}, ` +
      `${record.completedWorks}, ${record.ongoingWorks}, ${record.womenPersondays}, ` +
      `${record.scPersondays}, ${record.stPersondays}, ${record.totalExpenditure}, ` +
      `${record.wages}, ${record.households100Days}, ${record.paymentWithin15Days}, ` +
      `NOW(), NOW())`
    ).join(',\n');

    const sql = `
      INSERT INTO district_performance (
        district_code, fin_year, month, approved_labour_budget, average_wage_rate,
        average_days_employment, total_households_worked, total_individuals_worked,
        completed_works, ongoing_works, women_persondays, sc_persondays, st_persondays,
        total_expenditure, wages, households_100_days, payment_within_15_days,
        created_at, updated_at
      ) VALUES ${values}
      ON DUPLICATE KEY UPDATE
        approved_labour_budget = VALUES(approved_labour_budget),
        average_wage_rate = VALUES(average_wage_rate),
        average_days_employment = VALUES(average_days_employment),
        total_households_worked = VALUES(total_households_worked),
        total_individuals_worked = VALUES(total_individuals_worked),
        completed_works = VALUES(completed_works),
        ongoing_works = VALUES(ongoing_works),
        women_persondays = VALUES(women_persondays),
        sc_persondays = VALUES(sc_persondays),
        st_persondays = VALUES(st_persondays),
        total_expenditure = VALUES(total_expenditure),
        wages = VALUES(wages),
        households_100_days = VALUES(households_100_days),
        payment_within_15_days = VALUES(payment_within_15_days),
        updated_at = NOW()
    `;

    await sequelize.query(sql, { transaction });
    logger.info(`Raw SQL bulk upserted ${performanceRecords.length} records`);

    // Fetch the inserted/updated records
    const districtCodes = [...new Set(performanceRecords.map(r => r.districtCode))];
    const finYears = [...new Set(performanceRecords.map(r => r.finYear))];
    
    return await DistrictPerformance.findAll({
      where: {
        districtCode: { [Op.in]: districtCodes },
        finYear: { [Op.in]: finYears }
      },
      transaction
    });
  }

  /**
   * Bulk upsert extended metrics
   */
  async bulkUpsertExtendedMetrics(performances, apiData, transaction) {
    if (performances.length === 0) return;

    // Create a map for quick lookup
    const apiDataMap = new Map();
    apiData.forEach(record => {
      const stateCode = record.state_code || this.generateStateCode(record.state_name);
      const districtCode = record.district_code || this.generateDistrictCode(record.district_name, stateCode);
      const key = `${districtCode}_${record.fin_year || ''}_${record.month?.toUpperCase() || ''}`;
      apiDataMap.set(key, record);
    });

    const extendedMetricsRecords = performances.map(perf => {
      const key = `${perf.districtCode}_${perf.finYear}_${perf.month}`;
      const originalRecord = apiDataMap.get(key);

      return {
        performanceId: perf.id,
        // Only include fields that exist in your DistrictExtendedMetrics model
        totalWorkers: 0,
        totalActiveWorkers: 0,
        totalJobcardsIssued: 0,
        totalActiveJobcards: 0,
        scWorkersActive: 0,
        stWorkersActive: 0,
        differentlyAbledWorked: 0,
        percentNrmExpenditure: 0,
        percentCategoryBWorks: 0,
        percentAgricultureAllied: 0,
        totalAdminExpenditure: 0,
        materialSkilledWages: 0,
        persondaysCentralLiability: 0,
        totalWorksTakenup: 0,
        gpsWithNilExp: 0
      };
    });

    // Use ignoreDuplicates instead of updateOnDuplicate if you don't need to update
    await DistrictExtendedMetrics.bulkCreate(extendedMetricsRecords, {
      ignoreDuplicates: true, // Just skip if exists
      transaction
    });

    logger.info(`Bulk inserted ${extendedMetricsRecords.length} extended metrics`);
  }

  // ... Keep all your existing helper methods (generateStateCode, calculateSCSTPercentage, etc.)
  generateStateCode(stateName) {
    if (!stateName) return 'XX';
    
    const stateCodeMap = {
      'ANDHRA PRADESH': 'AP', 'ARUNACHAL PRADESH': 'AR', 'ASSAM': 'AS',
      'BIHAR': 'BR', 'CHHATTISGARH': 'CG', 'GOA': 'GA', 'GUJARAT': 'GJ',
      'HARYANA': 'HR', 'HIMACHAL PRADESH': 'HP', 'JHARKHAND': 'JH',
      'KARNATAKA': 'KA', 'KERALA': 'KL', 'MADHYA PRADESH': 'MP',
      'MAHARASHTRA': 'MH', 'MANIPUR': 'MN', 'MEGHALAYA': 'ML',
      'MIZORAM': 'MZ', 'NAGALAND': 'NL', 'ODISHA': 'OR', 'PUNJAB': 'PB',
      'RAJASTHAN': 'RJ', 'SIKKIM': 'SK', 'TAMIL NADU': 'TN',
      'TELANGANA': 'TG', 'TRIPURA': 'TR', 'UTTAR PRADESH': 'UP',
      'UTTARAKHAND': 'UK', 'WEST BENGAL': 'WB'
    };

    return stateCodeMap[stateName.toUpperCase()] || stateName.substring(0, 2).toUpperCase();
  }

  generateDistrictCode(districtName, stateCode) {
    if (!districtName || !stateCode) return 'UNKNOWN';
    const districtPrefix = districtName.substring(0, 3).toUpperCase();
    const hash = Math.abs(this.hashCode(districtName)) % 1000;
    return `${stateCode}${districtPrefix}${hash.toString().padStart(3, '0')}`;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  parseFinancialYear(finYear) {
    if (!finYear || !finYear.includes('-')) {
      const currentYear = new Date().getFullYear();
      return { startYear: currentYear, endYear: currentYear + 1 };
    }
    const [startYear, endYear] = finYear.split('-');
    return { startYear: parseInt(startYear), endYear: parseInt(endYear) };
  }

  calculateSCSTPercentage(performance) {
    const total = performance.totalIndividualsWorked || 1;
    const scSt = (performance.scPersondays || 0) + (performance.stPersondays || 0);
    return parseFloat(((scSt / total) * 100).toFixed(2));
  }

  calculateWomenPercentage(performance) {
    const total = performance.totalIndividualsWorked || 1;
    return parseFloat(((performance.womenPersondays / total) * 100).toFixed(2));
  }

  calculateCompletionRate(performance) {
    const total = (performance.completedWorks || 0) + (performance.ongoingWorks || 0);
    if (total === 0) return 0;
    return parseFloat(((performance.completedWorks / total) * 100).toFixed(2));
  }

  calculateBudgetUtilization(performance) {
    const budget = performance.approvedLabourBudget || 1;
    return parseFloat(((performance.totalExpenditure / budget) * 100).toFixed(2));
  }

  calculatePerformanceScore(district) {
    let score = 0;
    score += Math.min((district.averageDaysEmployment / 100) * 30, 30);
    score += (district.paymentWithin15Days / 100) * 25;
    score += Math.min((district.womenPersondays / 50) * 20, 20);
    const totalWorks = district.completedWorks + district.ongoingWorks;
    if (totalWorks > 0) {
      score += (district.completedWorks / totalWorks) * 25;
    }
    return Math.round(score);
  }

  /**
   * Get performance grade based on score
   */
  getPerformanceGrade(district) {
    const score = this.calculatePerformanceScore(district);
    
    if (score >= 80) return { grade: 'A', label: 'Excellent', color: '#43A047' };
    if (score >= 60) return { grade: 'B', label: 'Good', color: '#7CB342' };
    if (score >= 40) return { grade: 'C', label: 'Average', color: '#FB8C00' };
    if (score >= 20) return { grade: 'D', label: 'Below Average', color: '#F57C00' };
    return { grade: 'E', label: 'Poor', color: '#E65100' };
  }

  /**
   * Generate trend data from historical records
   */
  generateTrendData(historicalData) {
    const trends = {};
    
    historicalData.forEach(record => {
      const year = record.finYear;
      if (!trends[year]) {
        trends[year] = {
          year: year,
          avgDaysEmployment: [],
          totalHouseholds: 0,
          avgWageRate: [],
          womenParticipation: []
        };
      }
      
      trends[year].avgDaysEmployment.push(record.averageDaysEmployment);
      trends[year].totalHouseholds += record.totalHouseholdsWorked;
      trends[year].avgWageRate.push(record.averageWageRate);
      trends[year].womenParticipation.push(record.womenPersondays);
    });
    
    // Calculate averages
    Object.keys(trends).forEach(year => {
      const data = trends[year];
      data.avgDaysEmployment = data.avgDaysEmployment.reduce((a, b) => a + b, 0) / data.avgDaysEmployment.length;
      data.avgWageRate = data.avgWageRate.reduce((a, b) => a + b, 0) / data.avgWageRate.length;
      data.womenParticipation = data.womenParticipation.reduce((a, b) => a + b, 0) / data.womenParticipation.length;
    });
    
    return Object.values(trends).sort((a, b) => b.year.localeCompare(a.year));
  }

  /**
   * Calculate state-level statistics
   */
  async calculateStateStatistics(stateCode, finYear) {
    try {
      const result = await DistrictPerformance.findOne({
        include: [
          {
            model: District,
            as: 'district',
            where: { stateCode: stateCode },
            attributes: []
          }
        ],
        where: { finYear: finYear },
        attributes: [
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('district_code'))), 'totalDistricts'],
          [sequelize.fn('SUM', sequelize.col('total_households_worked')), 'totalHouseholds'],
          [sequelize.fn('SUM', sequelize.col('total_individuals_worked')), 'totalIndividuals'],
          [sequelize.fn('AVG', sequelize.col('average_wage_rate')), 'avgWageRate'],
          [sequelize.fn('AVG', sequelize.col('average_days_employment')), 'avgDaysEmployment'],
          [sequelize.fn('SUM', sequelize.col('completed_works')), 'totalCompletedWorks'],
          [sequelize.fn('SUM', sequelize.col('ongoing_works')), 'totalOngoingWorks'],
          [sequelize.fn('AVG', sequelize.col('women_persondays')), 'avgWomenParticipation'],
          [sequelize.fn('AVG', sequelize.col('payment_within_15_days')), 'avgPaymentEfficiency'],
          [sequelize.fn('SUM', sequelize.col('total_expenditure')), 'totalExpenditure'],
          [sequelize.fn('SUM', sequelize.col('wages')), 'totalWages']
        ],
        raw: true
      });

      return result;
    } catch (error) {
      logger.error('Error calculating state statistics:', error);
      throw error;
    }
  }

  /**
   * Generate comparison between districts
   */
  generateComparison(districts) {
    const comparison = {
      districts: [],
      metrics: {
        averageDaysEmployment: [],
        averageWageRate: [],
        totalHouseholdsWorked: [],
        womenPersondays: [],
        paymentWithin15Days: [],
        completedWorks: [],
        performanceScores: []
      }
    };

    districts.forEach(districtPerf => {
      const districtName = districtPerf.district?.districtName || 'Unknown';
      comparison.districts.push(districtName);
      comparison.metrics.averageDaysEmployment.push(districtPerf.averageDaysEmployment);
      comparison.metrics.averageWageRate.push(districtPerf.averageWageRate);
      comparison.metrics.totalHouseholdsWorked.push(districtPerf.totalHouseholdsWorked);
      comparison.metrics.womenPersondays.push(districtPerf.womenPersondays);
      comparison.metrics.paymentWithin15Days.push(districtPerf.paymentWithin15Days);
      comparison.metrics.completedWorks.push(districtPerf.completedWorks);
      comparison.metrics.performanceScores.push(this.calculatePerformanceScore(districtPerf));
    });

    // Add rankings
    comparison.rankings = {};
    Object.keys(comparison.metrics).forEach(metric => {
      const values = comparison.metrics[metric];
      const sorted = [...values].sort((a, b) => b - a);
      comparison.rankings[metric] = values.map(v => sorted.indexOf(v) + 1);
    });

    return comparison;
  }
}

module.exports = new DataProcessingService();