#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🌍 World Tracker Pre-flight Check\n');

// Check .env exists
if (!fs.existsSync('.env')) {
  console.error('❌ .env file not found!');
  console.error('\nPlease create one:');
  console.error('  cp env.example .env\n');
  process.exit(1);
}

console.log('✅ .env file found');

// Check PostgreSQL
try {
  execSync('pg_isready -q -h localhost -p 5432', { stdio: 'ignore' });
  console.log('✅ PostgreSQL is running\n');
} catch (error) {
  console.log('🔄 Starting PostgreSQL...');
  try {
    execSync('brew services start postgresql@14 2>/dev/null || brew services start postgresql', { 
      stdio: 'inherit',
      shell: true 
    });
    // Wait for it to start
    let attempts = 0;
    while (attempts < 10) {
      try {
        execSync('pg_isready -q -h localhost -p 5432', { stdio: 'ignore' });
        console.log('✅ PostgreSQL started\n');
        break;
      } catch {
        attempts++;
        if (attempts === 10) {
          console.log('⚠️  PostgreSQL may not have started. Continuing anyway...\n');
        }
        execSync('sleep 1');
      }
    }
  } catch (err) {
    console.log('⚠️  Could not auto-start PostgreSQL. Please start it manually.\n');
  }
}
