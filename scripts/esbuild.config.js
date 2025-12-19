#!/usr/bin/env node

import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const mode = process.env.NODE_ENV || process.argv[2] || 'development';
const isProduction = mode === 'production';

// Plugin to fix dayjs plugin imports by adding .js extension
const fixDayjsImportsPlugin = {
  name: 'fix-dayjs-imports',
  setup(build) {
    // Intercept dayjs plugin imports and add .js extension
    build.onResolve({ filter: /^dayjs\/plugin\// }, args => {
      if (args.kind === 'import-statement' || args.kind === 'require-call') {
        return {
          path: args.path + '.js',
          external: true
        };
      }
    });
  }
};




const config = {
  entryPoints: [path.resolve(__dirname, '../server/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: path.resolve(__dirname, '../dist'),
  packages: 'external',
  sourcemap: !isProduction,
  minify: isProduction,
  target: 'node18',
  
  // Add mainFields to help with ESM resolution
  mainFields: ['module', 'main'],
  
  // Resolve extensions for proper ESM module resolution
  resolveExtensions: ['.ts', '.js', '.mjs', '.json'],

  drop: isProduction ? ['console', 'debugger'] : [],

  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },

  banner: {
    js: `// ${isProduction ? 'Production' : 'Development'} build
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
  },

  logLevel: 'info',

  color: true,
  
  // Add the dayjs import fix plugin
  plugins: [fixDayjsImportsPlugin],
};


async function build() {
  try {






    
    const result = await esbuild.build(config);
    
    if (result.errors.length > 0) {
      console.error('❌ Build errors:', result.errors);
      process.exit(1);
    }
    
    if (result.warnings.length > 0) {
      console.warn('⚠️ Build warnings:', result.warnings);
    }
    

    
    if (isProduction) {

    } else {

    }
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}


build();
