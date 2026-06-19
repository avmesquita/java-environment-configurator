import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { applyClientProfileToFile, createBackup, restoreBackup, updateDataSourceInFile, updateDocBaseInFile } from './root-xml-writer';
import { parseRootXmlFile } from './root-xml-parser';
import { parseProfilesFromRootXmlFile } from './root-xml-comment-parser';
import { createLocalDemoProfile } from './seed-profiles';
import { detectTomcatEnv, resolveRootXmlPath } from './tomcat-path';
import { formatXml } from './xml-formatter';
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
} from './types';

export class AvmDatabase {
  private db: Database.Database;
  private backupsDir: string;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? path.join(os.homedir(), '.avm-environment-configurator', 'avm-environment-configurator.db');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(resolvedPath);
    this.backupsDir = path.join(dir, 'backups');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        tomcat_root_xml_path TEXT,
        catalina_base TEXT,
        catalina_home TEXT,
        custom_root_xml_path TEXT
      );

      CREATE TABLE IF NOT EXISTS client_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        database_type TEXT NOT NULL,
        dialect TEXT NOT NULL,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        url TEXT NOT NULL,
        driver_class_name TEXT NOT NULL,
        database_name TEXT NOT NULL,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS root_xml_backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        root_xml_path TEXT NOT NULL,
        backup_path TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS change_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS docbase_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_base TEXT NOT NULL UNIQUE,
        label TEXT,
        last_used_at TEXT NOT NULL DEFAULT (datetime('now')),
        use_count INTEGER NOT NULL DEFAULT 1
      );
    `);

    const settingsCount = this.db.prepare('SELECT COUNT(*) as count FROM app_settings').get() as { count: number };
    if (settingsCount.count === 0) {
      const env = detectTomcatEnv();
      this.db
        .prepare(
          `INSERT INTO app_settings (id, tomcat_root_xml_path, catalina_base, catalina_home, custom_root_xml_path)
           VALUES (1, NULL, ?, ?, NULL)`
        )
        .run(env.catalinaBase, env.catalinaHome);
    }

    this.seedProfilesIfEmpty();
  }

  private seedProfilesIfEmpty(): void {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM client_profiles').get() as { count: number };
    if (count.count > 0) {
      return;
    }

    try {
      const rootXmlPath = this.getResolvedRootXmlPath();
      this.importProfilesFromRootXml(rootXmlPath, false);
      return;
    } catch {
      // ROOT.xml ainda nao configurado
    }

    const demo = createLocalDemoProfile();
    this.db
      .prepare(
        `INSERT INTO client_profiles (code, name, database_type, dialect, username, password, url, driver_class_name, database_name, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        demo.code,
        demo.name,
        demo.databaseType,
        demo.dialect,
        demo.username,
        demo.password,
        demo.url,
        demo.driverClassName,
        demo.databaseName,
        demo.notes
      );
    this.logChange('seed_demo_profile', 'Perfil ficticio LOCAL_DEV criado');
  }

  importProfilesFromRootXml(rootXmlPath?: string, replaceExisting = true): ImportProfilesResult {
    const resolvedPath = rootXmlPath ?? this.getResolvedRootXmlPath();
    const parsedProfiles = parseProfilesFromRootXmlFile(resolvedPath);

    if (parsedProfiles.length === 0) {
      return { imported: 0, profiles: this.listProfiles() };
    }

    if (replaceExisting) {
      this.db.prepare('DELETE FROM client_profiles').run();
    }

    const insert = this.db.prepare(`
      INSERT INTO client_profiles (code, name, database_type, dialect, username, password, url, driver_class_name, database_name, notes)
      VALUES (@code, @name, @databaseType, @dialect, @username, @password, @url, @driverClassName, @databaseName, @notes)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        database_type = excluded.database_type,
        dialect = excluded.dialect,
        username = excluded.username,
        password = excluded.password,
        url = excluded.url,
        driver_class_name = excluded.driver_class_name,
        database_name = excluded.database_name,
        notes = excluded.notes
    `);

    const importMany = this.db.transaction((profiles: typeof parsedProfiles) => {
      for (const profile of profiles) {
        insert.run(profile);
      }
    });

    importMany(parsedProfiles);
    this.logChange('import_profiles', `Importados ${parsedProfiles.length} perfis de ${resolvedPath}`);

    return {
      imported: parsedProfiles.length,
      profiles: this.listProfiles()
    };
  }

  getSettings(): AppSettings {
    const row = this.db.prepare('SELECT * FROM app_settings WHERE id = 1').get() as {
      tomcat_root_xml_path: string | null;
      catalina_base: string | null;
      catalina_home: string | null;
      custom_root_xml_path: string | null;
    };

    return {
      tomcatRootXmlPath: row.tomcat_root_xml_path,
      catalinaBase: row.catalina_base,
      catalinaHome: row.catalina_home,
      customRootXmlPath: row.custom_root_xml_path
    };
  }

  updateSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const merged: AppSettings = {
      tomcatRootXmlPath: settings.tomcatRootXmlPath ?? current.tomcatRootXmlPath,
      catalinaBase: settings.catalinaBase ?? current.catalinaBase,
      catalinaHome: settings.catalinaHome ?? current.catalinaHome,
      customRootXmlPath: settings.customRootXmlPath ?? current.customRootXmlPath
    };

    this.db
      .prepare(
        `UPDATE app_settings SET
          tomcat_root_xml_path = ?,
          catalina_base = ?,
          catalina_home = ?,
          custom_root_xml_path = ?
         WHERE id = 1`
      )
      .run(
        merged.tomcatRootXmlPath,
        merged.catalinaBase,
        merged.catalinaHome,
        merged.customRootXmlPath
      );

    this.logChange('update_settings', JSON.stringify(merged));
    return merged;
  }

  getResolvedRootXmlPath(): string {
    const settings = this.getSettings();
    const resolved = resolveRootXmlPath(settings);
    if (!resolved) {
      throw new Error(
        'ROOT.xml nao encontrado. Configure CATALINA_BASE/CATALINA_HOME ou informe o caminho manualmente.'
      );
    }
    return resolved;
  }

  readRootXmlConfig(): RootXmlConfig {
    const rootXmlPath = this.getResolvedRootXmlPath();
    const config = parseRootXmlFile(rootXmlPath);
    config.rawPath = rootXmlPath;
    return config;
  }

  listProfiles(): ClientProfile[] {
    const rows = this.db
      .prepare('SELECT * FROM client_profiles ORDER BY code ASC')
      .all() as Array<{
      id: number;
      code: string;
      name: string;
      database_type: string;
      dialect: string;
      username: string;
      password: string;
      url: string;
      driver_class_name: string;
      database_name: string;
      notes: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      databaseType: row.database_type as ClientProfile['databaseType'],
      dialect: row.dialect,
      username: row.username,
      password: row.password,
      url: row.url,
      driverClassName: row.driver_class_name,
      databaseName: row.database_name,
      notes: row.notes
    }));
  }

  getProfileByCode(code: string): ClientProfile | null {
    return this.listProfiles().find((profile) => profile.code === code) ?? null;
  }

  applyProfile(code: string, dataSourceName: string, updateDialect = false): ApplyProfileResult {
    const profile = this.getProfileByCode(code);
    if (!profile) {
      throw new Error(`Perfil nao encontrado: ${code}`);
    }

    const rootXmlPath = this.getResolvedRootXmlPath();
    const config = this.readRootXmlConfig();
    const reason = `apply-profile:${code}:${dataSourceName}`;
    const result = applyClientProfileToFile(
      rootXmlPath,
      this.backupsDir,
      profile,
      config,
      dataSourceName,
      updateDialect,
      reason
    );

    this.registerBackup(rootXmlPath, result.backupPath, reason);
    this.logChange(
      'apply_profile',
      `Perfil ${code} aplicado em ${dataSourceName}${result.dialectUpdated ? ' (dialect atualizado)' : ''}`
    );

    return {
      backupPath: result.backupPath,
      rootXmlPath,
      profileCode: code,
      dataSourceName,
      dialectUpdated: result.dialectUpdated
    };
  }

  listDocBaseHistory(): DocBaseHistoryEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM docbase_history ORDER BY last_used_at DESC LIMIT 30')
      .all() as Array<{
      id: number;
      doc_base: string;
      label: string | null;
      last_used_at: string;
      use_count: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      docBase: row.doc_base,
      label: row.label,
      lastUsedAt: row.last_used_at,
      useCount: row.use_count
    }));
  }

  activateDocBase(docBase: string): UpdateDocBaseResult {
    return this.updateDocBase(docBase);
  }

  getBackupContent(backupId: number): BackupContentView {
    const backup = this.listBackups().find((item) => item.id === backupId);
    if (!backup) {
      throw new Error(`Backup nao encontrado: ${backupId}`);
    }

    const content = fs.readFileSync(backup.backupPath, 'utf-8');
    return {
      id: backup.id,
      backupPath: backup.backupPath,
      formattedContent: formatXml(content)
    };
  }

  updateDocBase(docBase: string): UpdateDocBaseResult {
    const rootXmlPath = this.getResolvedRootXmlPath();
    const reason = 'update-docbase';
    const result = updateDocBaseInFile(rootXmlPath, this.backupsDir, docBase, reason);

    this.registerBackup(rootXmlPath, result.backupPath, reason);
    this.recordDocBaseUsage(docBase);
    this.logChange('update_docbase', `docBase alterado para ${docBase}`);

    return {
      backupPath: result.backupPath,
      rootXmlPath,
      docBase
    };
  }

  updateDataSource(resourceName: string, resource: DataSourceConfig): UpdateDataSourceResult {
    const rootXmlPath = this.getResolvedRootXmlPath();
    const reason = `update-datasource:${resourceName}`;
    const result = updateDataSourceInFile(rootXmlPath, this.backupsDir, resourceName, resource, reason);

    this.registerBackup(rootXmlPath, result.backupPath, reason);
    this.logChange('update_datasource', `Resource ${resourceName} atualizado`);

    return {
      backupPath: result.backupPath,
      rootXmlPath,
      dataSourceName: resourceName
    };
  }

  createManualBackup(reason = 'manual-backup'): RootXmlBackup {
    const rootXmlPath = this.getResolvedRootXmlPath();
    const backupPath = createBackup(rootXmlPath, this.backupsDir, reason);
    return this.registerBackup(rootXmlPath, backupPath, reason);
  }

  listBackups(): RootXmlBackup[] {
    const rows = this.db
      .prepare('SELECT * FROM root_xml_backups ORDER BY id DESC')
      .all() as Array<{
      id: number;
      root_xml_path: string;
      backup_path: string;
      reason: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      rootXmlPath: row.root_xml_path,
      backupPath: row.backup_path,
      reason: row.reason,
      createdAt: row.created_at
    }));
  }

  restoreBackup(backupId: number): string {
    const backup = this.listBackups().find((item) => item.id === backupId);
    if (!backup) {
      throw new Error(`Backup nao encontrado: ${backupId}`);
    }

    restoreBackup(backup.rootXmlPath, backup.backupPath, this.backupsDir);
    this.logChange('restore_backup', `Backup ${backupId} restaurado`);
    return backup.rootXmlPath;
  }

  listChangeLog(): ChangeLogEntry[] {
    const rows = this.db.prepare('SELECT * FROM change_log ORDER BY id DESC LIMIT 100').all() as Array<{
      id: number;
      action: string;
      details: string;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      details: row.details,
      createdAt: row.created_at
    }));
  }

  private recordDocBaseUsage(docBase: string): void {
    this.db
      .prepare(
        `INSERT INTO docbase_history (doc_base, last_used_at, use_count)
         VALUES (?, datetime('now'), 1)
         ON CONFLICT(doc_base) DO UPDATE SET
           last_used_at = datetime('now'),
           use_count = use_count + 1`
      )
      .run(docBase);
  }

  private registerBackup(rootXmlPath: string, backupPath: string, reason: string): RootXmlBackup {
    const result = this.db
      .prepare(
        `INSERT INTO root_xml_backups (root_xml_path, backup_path, reason)
         VALUES (?, ?, ?)`
      )
      .run(rootXmlPath, backupPath, reason);

    return {
      id: Number(result.lastInsertRowid),
      rootXmlPath,
      backupPath,
      reason,
      createdAt: new Date().toISOString()
    };
  }

  private logChange(action: string, details: string): void {
    this.db.prepare('INSERT INTO change_log (action, details) VALUES (?, ?)').run(action, details);
  }

  close(): void {
    this.db.close();
  }
}
