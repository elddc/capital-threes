const axios = require('axios');
const fs = require('fs');

const API_KEY = process.env.CENSUS_API_KEY;
const BASE_URL = 'https://api.census.gov/data';

const INDICATORS = {
  'Median Household Income': 'B19013_001E',
  'Poverty Rate': 'B17001_002E',
  'Bachelor\'s Degree or Higher': 'B15003_022E',
  'Internet Access': 'B28002_004E',
  'Health Insurance Coverage': 'B27001_001E'
};

async function fetchDataForYear(year) {
  const url = `${BASE_URL}/${year}/acs/acs5`;
  
  try {
    const response = await axios.get(url, {
      params: {
        get: Object.values(INDICATORS).join(',') + ',NAME',
        for: 'zip code tabulation area:*',
        in: 'state:17', // FIPS code for Illinois
        key: API_KEY
      }
    });

    const [headers, ...dataRows] = response.data;
    const zipData = {};

    dataRows.forEach(row => {
      const zipCode = row[row.length - 1];
      const zipValues = {};
      Object.keys(INDICATORS).forEach((indicator, index) => {
        zipValues[indicator] = parseInt(row[index]);
      });
      zipData[zipCode] = zipValues;
    });

    return zipData;
  } catch (error) {
    console.error(`Error fetching data for ${year}:`, error.message);
    return null;
  }
}

async function fetchAllData() {
  if (!API_KEY) {
    throw new Error('Census API key not found. Please set the CENSUS_API_KEY environment variable.');
  }

  const allData = {};
  const years = Array.from({ length: 8 }, (_, i) => 2023 - i); // 2016 to 2023

  for (const year of years) {
    console.log(`Fetching data for Illinois, ${year}...`);
    const yearData = await fetchDataForYear(year);
    if (yearData) {
      allData[year] = yearData;
    }
  }

  return allData;
}

fetchAllData()
  .then(data => {
    fs.writeFileSync('illinois-zip-injustice-data.json', JSON.stringify(data, null, 2));
    console.log('Illinois ZIP code injustice data has been fetched and saved to illinois-zip-injustice-data.json');
  })
  .catch(error => {
    console.error('An error occurred:', error.message);
  });