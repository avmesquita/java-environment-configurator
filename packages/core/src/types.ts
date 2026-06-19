export type DatabaseType = 'sqlserver' | 'oracle' | 'hsql';

export interface DataSourceConfig {
  name: string;
  auth: string;
  type: string;
  maxTotal: string;
  maxIdle: string;
  maxWaitMillis: string;
  username: string;
  password: string;
  url: string;
  driverClassName: string;
  defaultAutoCommit: string;
  validationQuery?: string;
  removeAbandonedTimeout?: string;
  logAbandoned?: string;
  testOnBorrow?: string;
  removeAbandonedOnBorrow?: string;
  removeAbandonedOnMaintenance?: string;
}

export interface EnvironmentEntry {
  name: string;
  type: string;
  value: string;
}

export interface RootXmlConfig {
  docBase: string;
  reloadable: string;
  hibernateDialect: string | null;
  dataSources: DataSourceConfig[];
  environments: EnvironmentEntry[];
  rawPath: string;
}

export interface ClientProfile {
  id: number;
  code: string;
  name: string;
  databaseType: DatabaseType;
  dialect: string;
  username: string;
  password: string;
  url: string;
  driverClassName: string;
  databaseName: string;
  notes: string | null;
}

export interface AppSettings {
  tomcatRootXmlPath: string | null;
  catalinaBase: string | null;
  catalinaHome: string | null;
  customRootXmlPath: string | null;
}

export interface RootXmlBackup {
  id: number;
  rootXmlPath: string;
  backupPath: string;
  reason: string;
  createdAt: string;
}

export interface ChangeLogEntry {
  id: number;
  action: string;
  details: string;
  createdAt: string;
}

export interface ApplyProfileResult {
  backupPath: string;
  rootXmlPath: string;
  profileCode: string;
  dataSourceName: string;
  dialectUpdated: boolean;
}

export interface DocBaseHistoryEntry {
  id: number;
  docBase: string;
  label: string | null;
  lastUsedAt: string;
  useCount: number;
}

export interface BackupContentView {
  id: number;
  backupPath: string;
  formattedContent: string;
}

export interface UpdateDocBaseResult {
  backupPath: string;
  rootXmlPath: string;
  docBase: string;
}

export interface UpdateDataSourceResult {
  backupPath: string;
  rootXmlPath: string;
  dataSourceName: string;
}

export interface ImportProfilesResult {
  imported: number;
  profiles: ClientProfile[];
}
