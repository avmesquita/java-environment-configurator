import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('avmApi', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Record<string, string | null>) => ipcRenderer.invoke('settings:update', settings),
  listDocBaseHistory: () => ipcRenderer.invoke('docbase:history'),
  activateDocBase: (docBase: string) => ipcRenderer.invoke('docbase:activate', docBase),
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  importProfiles: () => ipcRenderer.invoke('profiles:import'),
  applyProfile: (payload: { code: string; dataSourceName: string; updateDialect: boolean }) =>
    ipcRenderer.invoke('profiles:apply', payload),
  updateDocBase: (docBase: string) => ipcRenderer.invoke('config:updateDocBase', docBase),
  updateDataSource: (resourceName: string, resource: Record<string, string | undefined>) =>
    ipcRenderer.invoke('config:updateDataSource', resourceName, resource),
  createBackup: () => ipcRenderer.invoke('backups:create'),
  listBackups: () => ipcRenderer.invoke('backups:list'),
  getBackupContent: (backupId: number) => ipcRenderer.invoke('backups:content', backupId),
  restoreBackup: (backupId: number) => ipcRenderer.invoke('backups:restore', backupId),
  listChangeLog: () => ipcRenderer.invoke('changelog:list')
});
