const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable workspace root discovery
config.resolver.disableHierarchicalLookup = true;

module.exports = config;