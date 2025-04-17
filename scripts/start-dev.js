import { spawn, exec } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// First check if port 5000 is already in use and kill the process
console.log('Checking for existing processes on port 5000...');

let killCommand;
if (process.platform === 'win32') {
  // Windows command
  killCommand = 'FOR /F "tokens=5" %P IN (\'netstat -ano ^| findstr :5000 ^| findstr LISTENING\') DO TaskKill /PID %P /F';
} else {
  // Unix command
  killCommand = "lsof -ti:5000 | xargs kill -9";
}

exec(killCommand, (error) => {
  if (error) {
    console.log('No existing process found on port 5000 or unable to kill it.');
  } else {
    console.log('Killed existing process on port 5000.');
  }
  
  // Start the server and client
  startServer();
});

function startServer() {
  console.log('Starting development environment...');
  
  // Start the server process
  const serverProcess = spawn('tsx', ['server/index.ts'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });
  
  // Wait a bit for the server to start up before launching the client
  setTimeout(() => {
    // Start the client process
    const clientProcess = spawn('cd', ['client', '&&', 'vite'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });
    
    // Handle client process events
    clientProcess.on('close', (code) => {
      console.log(`Client process exited with code ${code}`);
      serverProcess.kill();
      process.exit(code);
    });
  }, 2000);
  
  // Handle server process events
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    serverProcess.kill();
    process.exit(0);
  });
} 