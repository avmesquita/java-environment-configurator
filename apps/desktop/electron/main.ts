import { app, BrowserWindow, Menu } from 'electron';
import log from 'electron-log/main';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';

log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

Object.assign(console, log.functions);

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function resolveIndexHtmlPath(): string {
  return path.join(__dirname, '..', '..', 'dist', 'desktop', 'browser', 'index.html');
}

function createWindow(): void {
  app.setAppUserModelId('Java Environment Configurator');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('did-fail-load', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    log.info(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  const indexHtml = resolveIndexHtmlPath();
  log.info('Loading index.html', indexHtml);

  mainWindow.loadFile(indexHtml).catch((error: Error) => {
    log.error('Failed to load index.html', error);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menu = Menu.buildFromTemplate([
    {
      label: 'Arquivo',
      submenu: [{ label: 'Sair', role: 'quit' }]
    },
    {
      label: 'Visualizar',
      submenu: [
        { label: 'Recarregar', role: 'reload' },
        { label: 'Ferramentas do desenvolvedor', role: 'toggleDevTools' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  log.error('uncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('unhandledRejection', reason);
});
