const fs = require('fs');

const indicators = [
  'Median Household Income',
  'Poverty Rate',
  'Bachelor\'s Degree or Higher',
  'Internet Access',
  'Health Insurance Coverage'
];

const components = [
  'Economic Inequality',
  'Education Access',
  'Healthcare Disparity',
  'Criminal Justice',
  'Environmental Justice'
];

const policies = [
  'Increased minimum wage',
  'Expanded affordable housing programs',
  'Implemented police reform measures',
  'Expanded access to healthcare',
  'Increased funding for public education',
  'Implemented environmental protection measures',
  'Reformed criminal justice system',
  'Expanded voting rights',
  'Implemented anti-discrimination laws',
  'Increased funding for mental health services'
];

function generateRandomValue(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateRandomScore() {
  return Math.round(Math.random() * 100 * 10) / 10;
}

function generateRandomPolicies() {
  const numPolicies = Math.floor(Math.random() * 5) + 3; // 3 to 7 policies
  const shuffled = policies.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numPolicies);
}

function generateInjusticeData() {
  const data = {};
  const years = Array.from({ length: 8 }, (_, i) => 2016 + i);

  years.forEach(year => {
    data[year] = {};
    for (let stateId = 1; stateId <= 51; stateId++) {
      const stateCode = stateId.toString().padStart(2, '0');
      data[year][stateCode] = {};
      indicators.forEach(indicator => {
        data[year][stateCode][indicator] = generateRandomValue(10000, 1000000);
      });
    }
  });

  return data;
}

function generateStateDetails() {
  const stateDetails = {};
  
  for (let i = 1; i <= 51; i++) {
    const stateId = i.toString().padStart(2, '0');
    stateDetails[stateId] = {
      components: {},
      policies: generateRandomPolicies()
    };
    
    components.forEach(component => {
      stateDetails[stateId].components[component] = generateRandomScore();
    });
  }

  return stateDetails;
}

const injusticeData = generateInjusticeData();
const stateDetails = generateStateDetails();

fs.writeFileSync('injustice-data.json', JSON.stringify(injusticeData, null, 2));
fs.writeFileSync('state-details.json', JSON.stringify(stateDetails, null, 2));

console.log('Synthetic injustice data has been generated and saved to injustice-data.json');
console.log('Synthetic state details data has been generated and saved to state-details.json');