export default {

  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 1,
  numbersToExpressions: true,
  simplify: true,
  stringArrayShuffle: true,
  splitStrings: true,
  stringArrayThreshold: 1,
  

  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 4000,
  disableConsoleOutput: false, // Keep console output in production
  

  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false, // Keep false for Node.js compatibility
  renameProperties: false, // Keep false to avoid breaking object properties
  

  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.5,
  stringArrayEncoding: ['rc4'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  

  unicodeEscapeSequence: false, // Keep false for Node.js compatibility
  

  selfDefending: true,
  


  

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
