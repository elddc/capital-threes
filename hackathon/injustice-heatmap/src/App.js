import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, RefreshCw, Search, X } from 'lucide-react';
import { geoAlbers, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import { interpolate } from 'd3-interpolate';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import debounce from 'lodash.debounce';  // Import debounce from lodash

import illinoisZipGeoJson from './il_illinois_zip_codes_geo.min.json';
import illinoisInjusticeData from './illinois-zip-injustice-data.json';

const IllinoisZipHeatMap = () => {
  const [currentData, setCurrentData] = useState({});
  const [year, setYear] = useState(2016);
  const [isPlaying, setIsPlaying] = useState(false);
  const [illinoisZips, setIllinoisZips] = useState(null);
  const [selectedZip, setSelectedZip] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const svgRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    setIllinoisZips(illinoisZipGeoJson);
  }, []);

  const getColor = useCallback((score, mean, std) => {
    if (isNaN(score)) return '#808080'; // Color for N/A values
    const zScore = (score - mean) / std;
    if (zScore <= -1) {
      return '#00ff00'; // Low
    } else if (zScore <= 1) {
      return '#ffff00'; // Medium
    } else {
      return '#ff7000'; // High
    }
  }, []);

  const calculateInjusticeScore = useCallback((zipData, featureMeans, featureStds) => {
    if (!zipData) return null;
    const featureNames = Object.keys(zipData);
    const normalizedScores = featureNames.map(feature => {
      const value = zipData[feature];
      const mean = featureMeans[feature];
      const std = featureStds[feature];
      if (std === 0) return 0;
      return (value - mean) / std;
    });

    const totalScore = normalizedScores.reduce((sum, score) => sum + score, 0);
    return {
      totalScore: totalScore / normalizedScores.length,
      componentScores: Object.fromEntries(featureNames.map((feature, index) => [feature, normalizedScores[index]]))
    };
  }, []);

  const calculateInjusticeScores = useCallback((yearData) => {
    if (!yearData || Object.keys(yearData).length === 0) {
      console.warn(`No data available for the specified year.`);
      return { scores: {}, mean: 0, std: 0, componentScores: {}, rawData: {} };
    }

    const featureNames = Object.keys(Object.values(yearData)[0]);
    
    const featureMeans = {};
    const featureStds = {};
    
    featureNames.forEach(feature => {
      const allValues = Object.values(yearData).map(zip => zip[feature]);
      const mean = allValues.reduce((sum, value) => sum + value, 0) / allValues.length;
      featureMeans[feature] = mean;
      
      const squaredDiffs = allValues.map(value => Math.pow(value - mean, 2));
      const variance = squaredDiffs.reduce((sum, value) => sum + value, 0) / allValues.length;
      featureStds[feature] = Math.sqrt(variance);
    });

    const scores = {};
    const componentScores = {};
    Object.keys(yearData).forEach(zipCode => {
      const result = calculateInjusticeScore(yearData[zipCode], featureMeans, featureStds);
      scores[zipCode] = result.totalScore;
      componentScores[zipCode] = result.componentScores;
    });

    const scoreValues = Object.values(scores).filter(score => score !== null);
    const scoreMean = scoreValues.length > 0 ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length : 0;
    const scoreStd = scoreValues.length > 0 ? 
      Math.sqrt(scoreValues.reduce((sum, score) => sum + Math.pow(score - scoreMean, 2), 0) / scoreValues.length) : 0;

    return { scores, mean: scoreMean, std: scoreStd, componentScores, rawData: yearData };
  }, [calculateInjusticeScore]);

  useEffect(() => {
    if (illinoisInjusticeData[year]) {
      setCurrentData(calculateInjusticeScores(illinoisInjusticeData[year]));
    } else {
      console.warn(`No data available for year ${year}`);
      setCurrentData({ scores: {}, mean: 0, std: 0 });
    }
  }, [year, calculateInjusticeScores]);

  const getHistoricalData = useCallback((zipCode) => {
    return Object.keys(illinoisInjusticeData).map(year => ({
      year: parseInt(year),
      score: calculateInjusticeScores(illinoisInjusticeData[year]).scores[zipCode]
    }));
  }, [calculateInjusticeScores]);

  const handleZipSelect = useCallback((zipFeature) => {
    setSelectedZip(zipFeature);
    setHistoricalData(getHistoricalData(zipFeature.properties.ZCTA5CE10));
    setShowModal(true);
    setSearchTerm('');
    setSearchResults([]);
  }, [getHistoricalData]);

  const projection = useMemo(() => {
    if (illinoisZips) {
      return geoAlbers().fitSize([800, 500], illinoisZips);
    }
    return null;
  }, [illinoisZips]);

  const path = useMemo(() => {
    if (projection) {
      return geoPath().projection(projection);
    }
    return null;
  }, [projection]);

  useEffect(() => {
    if (svgRef.current && illinoisZips && path) {
      select(svgRef.current).selectAll('path')
        .data(illinoisZips.features)
        .join('path')
        .attr('d', path)
        .attr('fill', feature => {
          const zipCode = feature.properties.ZCTA5CE10;
          const score = currentData.scores[zipCode];
          return getColor(score, currentData.mean, currentData.std);
        })
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 0.1)
        .on('click', (event, feature) => handleZipSelect(feature));
    }
  }, [illinoisZips, path, currentData, getColor, handleZipSelect]);

  useEffect(() => {
    if (isPlaying) {
      let startTime;
      let currentAnimationYear = year;
  
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = (timestamp - startTime) / 1000; // Duration of 1 second
  
        if (progress < 1) {
          const interpolatedYear = interpolate(currentAnimationYear, currentAnimationYear + 1)(progress);
          setYear(Math.floor(interpolatedYear));
  
          const startData = calculateInjusticeScores(illinoisInjusticeData[Math.floor(currentAnimationYear)]);
          const endData = calculateInjusticeScores(illinoisInjusticeData[Math.ceil(currentAnimationYear)]);
          
          const interpolatedScores = {};
          Object.keys(startData.scores).forEach(zipCode => {
            if (endData.scores[zipCode] !== undefined) {
              interpolatedScores[zipCode] = interpolate(startData.scores[zipCode], endData.scores[zipCode])(progress);
            }
          });
          
          const interpolatedMean = interpolate(startData.mean, endData.mean)(progress);
          const interpolatedStd = interpolate(startData.std, endData.std)(progress);
  
          setCurrentData({ scores: interpolatedScores, mean: interpolatedMean, std: interpolatedStd });
  
          animationRef.current = requestAnimationFrame(animate);
        } else {
          currentAnimationYear++;
          if (currentAnimationYear >= 2023) {
            setIsPlaying(false);
            setYear(2023);
            setCurrentData(calculateInjusticeScores(illinoisInjusticeData[2023]));
          } else {
            startTime = null;
            animationRef.current = requestAnimationFrame(animate);
          }
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, year, calculateInjusticeScores]);

  const handleSearch = useCallback(debounce((event) => {
    const searchTerm = event.target.value.toLowerCase();
    setSearchTerm(searchTerm);
    if (searchTerm.length > 0 && illinoisZips) {
      const results = illinoisZips.features.filter(feature =>
        feature.properties.ZCTA5CE10.includes(searchTerm)
      );
      setSearchResults(results.slice(0, 10)); // Limit to 10 results for performance
    } else {
      setSearchResults([]);
    }
  }, 300), [illinoisZips]);  // Add debounce with a delay of 300ms

  const resetSimulation = useCallback(() => {
    setYear(2016);
    setCurrentData(calculateInjusticeScores(illinoisInjusticeData[2016]));
    setIsPlaying(false);
    setSelectedZip(null);
  }, [calculateInjusticeScores]);

  const ZipInfoModal = ({ zip, onClose }) => {
    if (!zip || !currentData.componentScores || !currentData.rawData) return null;
  
    const zipCode = zip.properties.ZCTA5CE10;

    const componentScores = currentData.componentScores[zipCode];
    const rawData = currentData.rawData[zipCode];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 text-white p-6 rounded-lg max-w-4xl w-full">
          <h2 className="text-2xl font-bold mb-4">ZIP Code {zipCode} - Year {Math.floor(year)}</h2>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Injustice Score: {currentData.scores[zipCode]?.toFixed(2) || 'N/A'}</h3>
              <div className="space-y-2">
                {Object.entries(componentScores).map(([feature, score]) => (
                  <div key={feature} className="flex justify-between items-center">
                    <span className="capitalize">{feature.replace(/_/g, ' ')}:</span>
                    <div className="flex items-center">
                      <span className="mr-2">{score.toFixed(2)}</span>
                      <span className="text-gray-400">({rawData[feature].toFixed(2)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Historical Data</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historicalData}>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-blue-900 text-white min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold mb-8 text-center text-yellow-400"
        >
          Illinois ZIP Code Injustice Heat Map
          <span className="block text-5xl md:text-6xl text-white mt-2">{Math.floor(year)}</span>
        </motion.h1>
  
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <div className="relative w-full md:w-64 mb-4 md:mb-0">
            <input
              type="text"
              placeholder="Search for a ZIP code..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-700 rounded-md shadow-lg">
                {searchResults.map(result => (
                  <div
                    key={result.properties.ZCTA5CE20}
                    className="px-4 py-2 hover:bg-gray-600 cursor-pointer"
                    onClick={() => handleZipSelect(result)}
                  >
                    {result.properties.ZCTA5CE20}
                  </div>
                ))}
              </div>
            )}
          </div>
  
          <div className="flex space-x-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition duration-300 flex items-center"
            >
              {isPlaying ? <Pause className="mr-2" size={24} /> : <Play className="mr-2" size={24} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={resetSimulation}
              className="px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition duration-300 flex items-center"
            >
              <RefreshCw className="mr-2" size={24} />
              Reset
            </button>
          </div>
        </div>
  
        <motion.div
          className="bg-gray-800 rounded-xl shadow-lg p-4 md:p-6 mb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <svg width="100%" height="100%" viewBox="0 0 800 500" ref={svgRef}>
            {illinoisZips && illinoisZips.features.map((feature) => {
              const zipCode = feature.properties.ZCTA5CE10;
              const { scores, mean, std } = currentData;
              const score = scores[zipCode];
    
              return (
                <path
                  key={zipCode}
                  d={path(feature)}
                  fill={getColor(score, mean, std)}
                  stroke="#fff"
                  strokeWidth="0.1"
                  onClick={() => handleZipSelect(feature)}
                />
              );
            })}
          </svg>
          <div className="flex justify-center mt-4 space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span>Low Injustice</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
              <span>Moderate Injustice</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
              <span>High Injustice</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-500 rounded-full mr-2"></div>
              <span>N/A</span>
            </div>
          </div>
        </motion.div>
  
        <motion.div
          className="mt-4"
          whileHover={{ scale: 1.05 }}
        >
          <input
            type="range"
            min="2017"
            max="2022"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm mt-2">
            <span>2017</span>
            <span>2022</span>
          </div>
        </motion.div>
  
        {showModal && (
          <ZipInfoModal
            zip={selectedZip}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
}

export default IllinoisZipHeatMap;
