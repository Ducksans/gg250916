#!/usr/bin/env node

/**
 * Next.js Development Server Port Manager
 *
 * This script ensures the Next.js development server ALWAYS runs on port 3000
 * by killing any process currently using that port before starting.
 */

const { spawn, execSync } = require('child_process');
const net = require('net');
const os = require('os');

const PORT = 3000;
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSection(title) {
  console.log('');
  log(`${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

/**
 * Check if a port is in use
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

/**
 * Get the PID of the process using the specified port
 */
function getProcessUsingPort(port) {
  try {
    const platform = os.platform();
    let command;

    if (platform === 'linux' || platform === 'darwin') {
      // Linux and macOS
      command = `lsof -ti:${port}`;
    } else if (platform === 'win32') {
      // Windows
      command = `netstat -ano | findstr :${port}`;
    } else {
      log(`Unsupported platform: ${platform}`, 'red');
      return null;
    }

    const result = execSync(command, { encoding: 'utf8' }).trim();

    if (platform === 'win32') {
      // On Windows, parse the netstat output to get the PID
      const lines = result.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          return parts[parts.length - 1];
        }
      }
      return null;
    }

    // On Linux/macOS, lsof returns the PID directly
    return result.split('\n')[0];
  } catch (error) {
    // No process found using the port
    return null;
  }
}

/**
 * Kill the process using the specified PID
 */
function killProcess(pid) {
  try {
    const platform = os.platform();

    if (platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }

    return true;
  } catch (error) {
    log(`Failed to kill process ${pid}: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Clear the port if it's in use
 */
async function clearPort(port) {
  const inUse = await isPortInUse(port);

  if (inUse) {
    log(`⚠️  Port ${port} is already in use`, 'yellow');

    const pid = getProcessUsingPort(port);
    if (pid) {
      log(`   Found process with PID: ${pid}`, 'yellow');
      log(`   Attempting to kill process...`, 'yellow');

      if (killProcess(pid)) {
        log(`✅ Successfully killed process on port ${port}`, 'green');

        // Wait a moment for the port to be released
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify the port is now free
        const stillInUse = await isPortInUse(port);
        if (!stillInUse) {
          log(`✅ Port ${port} is now available`, 'green');
          return true;
        } else {
          log(`❌ Port ${port} is still in use after killing process`, 'red');
          return false;
        }
      } else {
        log(`❌ Failed to kill process on port ${port}`, 'red');
        return false;
      }
    } else {
      log(`❌ Could not identify process using port ${port}`, 'red');
      log(`   You may need to manually kill the process`, 'yellow');
      return false;
    }
  } else {
    log(`✅ Port ${port} is available`, 'green');
    return true;
  }
}

/**
 * Start the Next.js development server
 */
function startNextServer() {
  logSection('Starting Next.js Development Server');

  log(`🚀 Starting Next.js on port ${PORT}...`, 'cyan');

  // Set environment variables to force port 3000
  const env = {
    ...process.env,
    PORT: PORT.toString(),
    NODE_ENV: 'development'
  };

  // Start Next.js dev server with specific port
  const nextProcess = spawn('npx', ['next', 'dev', '-p', PORT.toString(), '--turbopack'], {
    stdio: 'inherit',
    env: env,
    shell: true
  });

  nextProcess.on('error', (error) => {
    log(`❌ Failed to start Next.js: ${error.message}`, 'red');
    process.exit(1);
  });

  nextProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`❌ Next.js exited with code ${code}`, 'red');
      process.exit(code);
    }
  });

  // Handle process termination
  process.on('SIGINT', () => {
    log('\n👋 Shutting down Next.js server...', 'yellow');
    nextProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log('\n👋 Shutting down Next.js server...', 'yellow');
    nextProcess.kill('SIGTERM');
    process.exit(0);
  });
}

/**
 * Main function
 */
async function main() {
  logSection('금강 2.0 Development Server Manager');

  log(`🔍 Checking port ${PORT}...`, 'cyan');

  const portCleared = await clearPort(PORT);

  if (!portCleared) {
    log(`\n❌ Could not secure port ${PORT}`, 'red');
    log(`Please manually check what's using port ${PORT} and try again.`, 'yellow');

    if (os.platform() === 'linux' || os.platform() === 'darwin') {
      log(`\nYou can try running:`, 'yellow');
      log(`  sudo lsof -i:${PORT}`, 'cyan');
      log(`  sudo kill -9 <PID>`, 'cyan');
    } else if (os.platform() === 'win32') {
      log(`\nYou can try running as Administrator:`, 'yellow');
      log(`  netstat -ano | findstr :${PORT}`, 'cyan');
      log(`  taskkill /F /PID <PID>`, 'cyan');
    }

    process.exit(1);
  }

  // Add a small delay to ensure port is fully released
  await new Promise(resolve => setTimeout(resolve, 500));

  // Start the Next.js server
  startNextServer();
}

// Run the main function
main().catch((error) => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
