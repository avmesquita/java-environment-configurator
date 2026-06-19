import { Injectable } from '@angular/core';
import { ApplyProfileRequest, AvmApi } from './electron-api.types';

@Injectable({ providedIn: 'root' })
export class ElectronService {
  private get api(): AvmApi {
    if (!window.avmApi) {
      throw new Error('API Electron indisponivel. Execute o app via Electron.');
    }
    return window.avmApi;
  }

  getConfig() {
    return this.api.getConfig();
  }

  getSettings() {
    return this.api.getSettings();
  }

  updateSettings(settings: Parameters<AvmApi['updateSettings']>[0]) {
    return this.api.updateSettings(settings);
  }

  listDocBaseHistory() {
    return this.api.listDocBaseHistory();
  }

  activateDocBase(docBase: string) {
    return this.api.activateDocBase(docBase);
  }

  listProfiles() {
    return this.api.listProfiles();
  }

  importProfiles() {
    return this.api.importProfiles();
  }

  applyProfile(payload: ApplyProfileRequest) {
    return this.api.applyProfile(payload);
  }

  updateDocBase(docBase: string) {
    return this.api.updateDocBase(docBase);
  }

  updateDataSource(resourceName: string, resource: Parameters<AvmApi['updateDataSource']>[1]) {
    return this.api.updateDataSource(resourceName, resource);
  }

  createBackup() {
    return this.api.createBackup();
  }

  listBackups() {
    return this.api.listBackups();
  }

  getBackupContent(backupId: number) {
    return this.api.getBackupContent(backupId);
  }

  restoreBackup(backupId: number) {
    return this.api.restoreBackup(backupId);
  }

  listChangeLog() {
    return this.api.listChangeLog();
  }
}
