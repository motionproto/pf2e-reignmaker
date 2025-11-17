#!/usr/bin/env node

/**
 * Cross-platform Python runner
 * Automatically detects whether to use 'python' or 'python3'
 * Usage: node buildscripts/run-python.js <script.py> [args...]
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the Python script path from command line arguments
const scriptPath = process.argv[2];
const scriptArgs = process.argv.slice(3);

if (!scriptPath) {
  console.error('Error: No Python script specified');
  console.error('Usage: node buildscripts/run-python.js <script.py> [args...]');
  process.exit(1);
}

// Detect which Python command is available
function detectPython() {
  // Try python3 first (common on macOS/Linux)
  const python3Test = spawnSync('python3', ['--version'], { stdio: 'pipe' });
  if (python3Test.status === 0) {
    return 'python3';
  }
  
  // Fall back to python (common on Windows)
  const pythonTest = spawnSync('python', ['--version'], { stdio: 'pipe' });
  if (pythonTest.status === 0) {
    return 'python';
  }
  
  // Neither found
  console.error('Error: Neither python nor python3 found in PATH');
  console.error('Please install Python 3.x from https://www.python.org/downloads/');
  process.exit(1);
}

const pythonCmd = detectPython();
console.log(`Using: ${pythonCmd}`);

// Run the Python script
const result = spawnSync(pythonCmd, [scriptPath, ...scriptArgs], {
  stdio: 'inherit',
  cwd: process.cwd()
});

process.exit(result.status || 0);
