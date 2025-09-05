const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable workspace root discovery
config.resolver.disableHierarchicalLookup = true;

// Ensure Metro can resolve @babel/runtime properly
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules')
];

module.exports = config;