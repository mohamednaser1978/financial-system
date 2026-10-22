const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });

  Menu.setApplicationMenu(null);

  // During development, connect to the Next.js dev server
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startPythonBackend() {
  console.log('Starting Python backend...');
  
  // In development, we run 'python -m backend.main'
  // In production, we would run the bundled .exe
  const pythonPath = 'python'; // Or the path to your venv python
  pythonProcess = spawn(pythonPath, ['-m', 'backend.main'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python process:', err);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

app.on('ready', () => {
  startPythonBackend();
  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if (pythonProcess) {
      console.log('Killing Python process...');
      pythonProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
