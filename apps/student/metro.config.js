const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable workspace root discovery
config.resolver.disableHierarchicalLookup = true;

// Ensure proper module resolution for @babel/runtime
config.resolver.alias = {
  '@babel/runtime': require.resolve('@babel/runtime/package.json').replace('/package.json', ''),
};

module.exports = config;