import { ipcMain } from 'electron';
import { AvmDatabase } from '@avm/core';

let database: AvmDatabase | null = null;

function getDatabase(): AvmDatabase {
  if (!database) {
    database = new AvmDatabase();
  }
  return database;
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:get', () => getDatabase().readRootXmlConfig());

  ipcMain.handle('settings:get', () => {
    const db = getDatabase();
    return {
      settings: db.getSettings(),
      resolvedRootXmlPath: safeResolvePath(db)
    };
  });

  ipcMain.handle('settings:update', (_event, settings) => getDatabase().updateSettings(settings));

  ipcMain.handle('docbase:history', () => getDatabase().listDocBaseHistory());

  ipcMain.handle('docbase:activate', (_event, docBase: string) => getDatabase().activateDocBase(docBase));

  ipcMain.handle('profiles:list', () => getDatabase().listProfiles());

  ipcMain.handle('profiles:import', () => getDatabase().importProfilesFromRootXml());

  ipcMain.handle('profiles:apply', (_event, payload: { code: string; dataSourceName: string; updateDialect: boolean }) =>
    getDatabase().applyProfile(payload.code, payload.dataSourceName, payload.updateDialect)
  );

  ipcMain.handle('config:updateDocBase', (_event, docBase: string) => getDatabase().updateDocBase(docBase));

  ipcMain.handle('config:updateDataSource', (_event, resourceName: string, resource) =>
    getDatabase().updateDataSource(resourceName, resource)
  );

  ipcMain.handle('backups:create', () => getDatabase().createManualBackup('desktop-manual-backup'));

  ipcMain.handle('backups:list', () => getDatabase().listBackups());

  ipcMain.handle('backups:content', (_event, backupId: number) => getDatabase().getBackupContent(backupId));

  ipcMain.handle('backups:restore', (_event, backupId: number) => getDatabase().restoreBackup(backupId));

  ipcMain.handle('changelog:list', () => getDatabase().listChangeLog());
}

function safeResolvePath(db: AvmDatabase): string | null {
  try {
    return db.getResolvedRootXmlPath();
  } catch {
    return null;
  }
}
