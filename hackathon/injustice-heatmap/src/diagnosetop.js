const fs = require('fs');

// Load the US TopoJSON file
const us = JSON.parse(fs.readFileSync('/Users/ericmodesitt/Desktop/builder/hackathon/injustice-heatmap/src/tl_2023_us_zcta520.json', 'utf8'));

const geometries = us.objects.tl_2023_us_zcta520.geometries;

console.log(`Total number of geometries: ${geometries.length}`);

// Function to examine the first few geometries
function examineGeometries(count) {
    console.log(`\nExamining the first ${count} geometries:`);
    for (let i = 0; i < count && i < geometries.length; i++) {
        const geometry = geometries[i];
        console.log(`\nGeometry ${i + 1}:`);
        console.log('Type:', geometry.type);
        console.log('Properties:', JSON.stringify(geometry.properties, null, 2));
        console.log('Arcs:', geometry.arcs);
    }
}

// Examine the first 5 geometries
examineGeometries(5);

// Function to count geometries by state
function countGeometriesByState() {
    const stateCounts = {};
    geometries.forEach(geometry => {
        const state = geometry.properties?.STATE || 'Unknown';
        stateCounts[state] = (stateCounts[state] || 0) + 1;
    });
    return stateCounts;
}

console.log('\nGeometry counts by state:');
console.log(countGeometriesByState());

// Function to find Illinois geometries
function findIllinoisGeometries() {
    return geometries.filter(geometry => {
        // Adjust this condition based on how Illinois is identified in your data
        return geometry.properties?.STATE === '17'; // Assuming '17' is the FIPS code for Illinois
    });
}

const illinoisGeometries = findIllinoisGeometries();
console.log(`\nNumber of Illinois geometries found: ${illinoisGeometries.length}`);

// Examine the first Illinois geometry if found
if (illinoisGeometries.length > 0) {
    console.log('\nFirst Illinois geometry:');
    console.log(JSON.stringify(illinoisGeometries[0], null, 2));
}