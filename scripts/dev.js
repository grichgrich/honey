import { spawn } from 'child_process';
import chalk from 'chalk';

// Configuration
const VITE_PORT = 5001;
const PYTHON_PORT = 8000;

function startViteServer() {
  console.log(chalk.blue('Starting Vite development server...'));
  
  const vite = spawn('npm', ['run', 'dev:vite'], {
    stdio: 'inherit',
    shell: true
  });

  return vite;
}

function startPythonServer() {
  console.log(chalk.blue('Starting Python FastAPI server...'));
  
  // Activate virtual environment and start server
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  const pythonServer = spawn(pythonCommand, [
    'python/leverage_service.py'
  ], {
    stdio: 'inherit',
    shell: true
  });

  return pythonServer;
}

// Start all services
console.log(chalk.green('Starting ChainQuest development environment...'));

const vite = startViteServer();
const python = startPythonServer();

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nShutting down development servers...'));
  
  vite.kill();
  python.kill();
  
  process.exit(0);
});