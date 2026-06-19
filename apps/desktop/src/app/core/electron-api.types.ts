import {
  AppSettings,
  ApplyProfileResult,
  BackupContentView,
  ChangeLogEntry,
  ClientProfile,
  DataSourceConfig,
  DocBaseHistoryEntry,
  ImportProfilesResult,
  RootXmlBackup,
  RootXmlConfig,
  UpdateDataSourceResult,
  UpdateDocBaseResult
} from '@avm/core/types';

export interface SettingsView {
  settings: AppSettings;
  resolvedRootXmlPath: string | null;
}

export interface ApplyProfileRequest {
  code: string;
  dataSourceName: string;
  updateDialect: boolean;
}

export interface AvmApi {
  getConfig: () => Promise<RootXmlConfig>;
  getSettings: () => Promise<SettingsView>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  listDocBaseHistory: () => Promise<DocBaseHistoryEntry[]>;
  activateDocBase: (docBase: string) => Promise<UpdateDocBaseResult>;
  listProfiles: () => Promise<ClientProfile[]>;
  importProfiles: () => Promise<ImportProfilesResult>;
  applyProfile: (payload: ApplyProfileRequest) => Promise<ApplyProfileResult>;
  updateDocBase: (docBase: string) => Promise<UpdateDocBaseResult>;
  updateDataSource: (resourceName: string, resource: DataSourceConfig) => Promise<UpdateDataSourceResult>;
  createBackup: () => Promise<RootXmlBackup>;
  listBackups: () => Promise<RootXmlBackup[]>;
  getBackupContent: (backupId: number) => Promise<BackupContentView>;
  restoreBackup: (backupId: number) => Promise<string>;
  listChangeLog: () => Promise<ChangeLogEntry[]>;
}

declare global {
  interface Window {
    avmApi?: AvmApi;
  }
}
