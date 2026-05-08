// metro.config.js — Fix for Node.js 20+ / 22+ / 24+ compatibility with Metro
// Node 20+ introduced new built-in modules (node:sea, node:module, etc.) that
// older versions of Metro don't recognize. This config stubs them out.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Stub out Node 20+ built-in modules that Metro can't resolve
const nodeBuiltins = {
  'node:sea': require.resolve('./src/stubs/empty.js'),
  'node:sqlite': require.resolve('./src/stubs/empty.js'),
  'node:module': require.resolve('./src/stubs/empty.js'),
};

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...nodeBuiltins,
    ...(config.resolver?.extraNodeModules ?? {}),
  },
};

module.exports = config;
