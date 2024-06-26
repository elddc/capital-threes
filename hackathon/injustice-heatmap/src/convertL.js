const fs = require('fs');
const topojson = require('topojson-client');
const toposimplify = require('topojson-simplify');

// Load the US TopoJSON file
const us = JSON.parse(fs.readFileSync('/Users/ericmodesitt/Desktop/builder/hackathon/injustice-heatmap/src/tl_2023_us_zcta520.json', 'utf8'));

// Convert TopoJSON to GeoJSON
const geojson = topojson.feature(us, us.objects.zip_codes); // Replace 'zip_codes' with the actual name of your ZIP codes object

// Filter for Illinois (FIPS code 17)
const illinoisFeatures = geojson.features.filter(feature => 
  feature.properties.STATEFP === '17' // '17' is the FIPS code for Illinois
);

// Create a new GeoJSON object with only Illinois features
const illinoisGeojson = {
  type: 'FeatureCollection',
  features: illinoisFeatures
};

// Convert GeoJSON back to TopoJSON
const illinoisTopo = topojson.topology({zip_codes: illinoisGeojson});

// Simplify the TopoJSON (optional, but can reduce file size)
const simplified = toposimplify.simplify(illinoisTopo, 0.01);

// Write the filtered and simplified TopoJSON to a new file
fs.writeFileSync('illinois-zip-codes.json', JSON.stringify(simplified));

console.log('Illinois ZIP codes TopoJSON has been created.');