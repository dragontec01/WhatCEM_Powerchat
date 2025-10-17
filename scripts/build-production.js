#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildProduction() {




if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}



try {
  execSync('npm run build:production', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}



const serverFile = path.join(__dirname, '../dist/index.js');

if (!fs.existsSync(serverFile)) {
  console.error('❌ Server file not found:', serverFile);
  process.exit(1);
}

try {
  const sourceCode = fs.readFileSync(serverFile, 'utf8');
  const obfuscatorConfigModule = await import('../obfuscator.config.js');
  const obfuscatorConfig = obfuscatorConfigModule.default;
  

  const obfuscatedCode = JavaScriptObfuscator.obfuscate(sourceCode, obfuscatorConfig);
  

  fs.writeFileSync(serverFile, obfuscatedCode.getObfuscatedCode());
  

} catch (error) {
  console.error('❌ Obfuscation failed:', error.message);
  process.exit(1);
}



const publicDir = path.join(__dirname, '../dist/public');
if (fs.existsSync(publicDir)) {
  const files = fs.readdirSync(publicDir, { recursive: true });
  files.forEach(file => {
    if (typeof file === 'string' && file.endsWith('.map')) {
      const mapFile = path.join(publicDir, file);
      if (fs.existsSync(mapFile)) {
        fs.unlinkSync(mapFile);

      }
    }
  });
}



const runtimeProtection = `

(function() {
  'use strict';




  setInterval(function() {
    if (typeof window !== 'undefined') return;
    const start = Date.now();
    debugger;
    if (Date.now() - start > 100) {
      console.warn('⚠️ Debugging attempt detected');

    }
  }, 9000);


  if (process.env.NODE_ENV !== 'production') {
    console.error('Invalid environment');
    process.exit(1);
  }
})();

`;


const obfuscatedCode = fs.readFileSync(serverFile, 'utf8');
fs.writeFileSync(serverFile, runtimeProtection + obfuscatedCode);



  try {
    execSync('npm run build:verify', { stdio: 'inherit' });

  } catch (error) {
    console.warn('⚠️ Console log verification failed, but build continues');
    console.warn('   Some console statements may still be present in the build');
  }






}


buildProduction().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
