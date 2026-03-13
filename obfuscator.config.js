export default {

  compact: true,
  controlFlowFlattening: false, // Disabled - causes Node 24 V8 issues
  controlFlowFlatteningThreshold: 0.75,
  numbersToExpressions: true,
  simplify: true,
  stringArrayShuffle: true,
  splitStrings: true,
  stringArrayThreshold: 0.75,
  

  deadCodeInjection: false, // Disabled - causes Node 24 issues
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false, // Disabled - causes Node 24 issues
  debugProtectionInterval: 0,
  disableConsoleOutput: false, // Keep console output in production
  

  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false, // Keep false for Node.js compatibility
  renameProperties: false, // Keep false to avoid breaking object properties
  

  stringArray: true,
  stringArrayCallsTransform: false, // Disabled - can cause issues with Node 24
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['base64'], // Changed from rc4 - rc4 can cause issues
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: false, // Disabled for stability
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  

  unicodeEscapeSequence: false, // Keep false for Node.js compatibility
  

  selfDefending: false, // Disabled - primary cause of Node 24 crashes
  


  

  reservedNames: [
    'require',
    'module',
    'exports',
    '__dirname',
    '__filename',
    'process',
    'global',
    'Buffer',
    'console',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval'
  ],
  

  reservedStrings: [
    'use strict',
    'node_modules',
    'package.json'
  ],
  

  transformObjectKeys: false, // Keep false to avoid breaking object properties
  

  sourceMap: false,
  sourceMapMode: 'separate'
};
