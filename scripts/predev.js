#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌍 World Tracker Pre-flight Check\n');

const envCandidates = ['.env', path.join('backend', '.env')];
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));

if (!envPath) {
  console.error('❌ .env file not found!');
  console.error('\nPlease create one:');
  console.error('  cp env.example .env\n');
  process.exit(1);
}

console.log(`✅ .env file found (${envPath})`);

const loadEnvFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
};

const envVars = loadEnvFile(envPath);

const ensureDatabase = (databaseUrl) => {
  if (!databaseUrl) {
    console.log('⚠️  DATABASE_URL not found; skipping DB setup\n');
    return;
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl.replace(/^postgres:\/\//, 'postgresql://'));
  } catch (error) {
    console.log('⚠️  Invalid DATABASE_URL; skipping DB setup\n');
    return;
  }

  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName) {
    console.log('⚠️  DATABASE_URL missing database name; skipping DB setup\n');
    return;
  }

  const args = [];
  if (parsed.hostname) args.push(`-h ${parsed.hostname}`);
  if (parsed.port) args.push(`-p ${parsed.port}`);
  if (parsed.username) args.push(`-U ${parsed.username}`);

  const env = { ...process.env };
  if (parsed.password) env.PGPASSWORD = parsed.password;

  try {
    const result = execSync(
      `psql ${args.join(' ')} -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname='${dbName}'"`,
      { stdio: 'pipe', shell: true, env }
    ).toString().trim();

    if (result !== '1') {
      console.log(`🔄 Creating database "${dbName}"...`);
      execSync(`createdb ${args.join(' ')} ${dbName}`, { stdio: 'inherit', shell: true, env });
      console.log('✅ Database created');
    } else {
      console.log('✅ Database exists');
    }

    console.log('🔄 Applying Prisma migrations...');
    execSync('npx prisma migrate deploy --schema backend/prisma/schema.prisma', {
      stdio: 'inherit',
      shell: true,
      env,
    });
    console.log('✅ Prisma migrations applied\n');
  } catch (error) {
    console.log('⚠️  Could not verify/create database. Continuing anyway...\n');
  }
};

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

// Ensure DB exists + schema is applied
ensureDatabase(envVars.DATABASE_URL);
