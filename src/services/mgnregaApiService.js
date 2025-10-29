const axios = require('axios');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class MGNREGAApiService {
  constructor() {
    this.baseURL = process.env.MGNREGA_API_URL || 'https://api.data.gov.in/resource/ee03643a-ee4c-48c2-ac30-9f2ff26ab722';
    this.apiKey = process.env.MGNREGA_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'accept': 'application/json'
      }
    });
  }

  async fetchDistrictData({ stateName, finYear, districtName = null }) {
    try {
      const cacheKey = `mgnrega:${stateName}:${finYear}:${districtName || 'all'}`;
      
      // Check cache first
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for ${cacheKey}`);
        return cachedData;
      }

      const params = {
        'api-key': this.apiKey,
        'format': 'json',
        'limit': '100',
        'filters[state_name]': stateName.toUpperCase(),
        'filters[fin_year]': finYear
      };

      if (districtName) {
        params['filters[district_name]'] = districtName.toUpperCase();
      }

      const response = await this.axiosInstance.get('', { params });
      
      if (response.data && response.data.records) {
        const records = response.data.records;
        
        // Cache for 1 hour
        await cacheService.set(cacheKey, records, 3600);
        
        return records;
      }

      return [];
    } catch (error) {
      logger.error('MGNREGA API Error:', error.message);
      throw new Error('Failed to fetch data from MGNREGA API');
    }
  }

  async fetchStatesList() {
    try {
      const cacheKey = 'mgnrega:states:list';
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      // For now, return hardcoded states
      const states = [
        'ANDHRA PRADESH', 'ARUNACHAL PRADESH', 'ASSAM', 'BIHAR',
        'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH',
        'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA',
        'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA',
        'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL NADU', 'TELANGANA',
        'TRIPURA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL'
      ];

      await cacheService.set(cacheKey, states, 86400); // Cache for 24 hours
      return states;
    } catch (error) {
      logger.error('Error fetching states:', error);
      throw error;
    }
  }

  async fetchDistrictsList(state) {
    try {
      // const cacheKey = `mgnrega:districts:${state}`;
      // const cachedData = await cacheService.get(cacheKey);
      
      // if (cachedData) {
      //   return cachedData;
      // }

      // Fetch all data for the state and extract unique districts
      const data = await this.fetchDistrictData({ 
        stateName: state,
        finYear: '2024-2025' 
      });

      console.log('inside fetchdistrict data..............');
     
      
      const districts = [...new Set(data.map(item => item.district_name))];
      console.log(districts);
      
      // await cacheService.set(cacheKey, districts, 86400); // Cache for 24 hours
      return districts;
    } catch (error) {
      logger.error('Error fetching districts:', error);
      throw error;
    }
  }
}

module.exports = new MGNREGAApiService();