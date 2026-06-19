import * as fs from 'fs';
import * as path from 'path';
import { ClientProfile, DataSourceConfig, RootXmlConfig } from './types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatResource(resource: DataSourceConfig, indent: string): string {
  const attrs: string[] = [
    `name="${escapeXml(resource.name)}"`,
    `auth="${escapeXml(resource.auth)}"`,
    `type="${escapeXml(resource.type)}"`,
    `maxTotal="${escapeXml(resource.maxTotal)}"`,
    `maxIdle="${escapeXml(resource.maxIdle)}"`,
    `maxWaitMillis="${escapeXml(resource.maxWaitMillis)}"`,
    `username="${escapeXml(resource.username)}"`,
    `password="${escapeXml(resource.password)}"`,
    `url="${escapeXml(resource.url)}"`,
    `driverClassName="${escapeXml(resource.driverClassName)}"`,
    `defaultAutoCommit="${escapeXml(resource.defaultAutoCommit)}"`
  ];

  if (resource.validationQuery) {
    attrs.push(`validationQuery="${escapeXml(resource.validationQuery)}"`);
  }
  if (resource.removeAbandonedTimeout) {
    attrs.push(`removeAbandonedTimeout="${escapeXml(resource.removeAbandonedTimeout)}"`);
  }
  if (resource.logAbandoned) {
    attrs.push(`logAbandoned="${escapeXml(resource.logAbandoned)}"`);
  }
  if (resource.testOnBorrow) {
    attrs.push(`testOnBorrow="${escapeXml(resource.testOnBorrow)}"`);
  }
  if (resource.removeAbandonedOnBorrow) {
    attrs.push(`removeAbandonedOnBorrow="${escapeXml(resource.removeAbandonedOnBorrow)}"`);
  }
  if (resource.removeAbandonedOnMaintenance) {
    attrs.push(`removeAbandonedOnMaintenance="${escapeXml(resource.removeAbandonedOnMaintenance)}"`);
  }

  return `${indent}<Resource ${attrs.join('\n       ')}\n${indent}/>`;
}

function updateDialect(content: string, dialectEnvironmentName: string, dialect: string): string {
  const escapedName = escapeRegex(dialectEnvironmentName);
  const pattern = new RegExp(
    `(<Environment\\s+name="${escapedName}"[^>]*value=")([^"]*)(")`,
    'i'
  );

  if (pattern.test(content)) {
    return content.replace(pattern, `$1${escapeXml(dialect)}$3`);
  }

  const firstResource = content.match(/<Resource\s+name="([^"]+)"/i);
  if (!firstResource || !firstResource.index) {
    throw new Error('Nao foi possivel localizar Environment/Resource para inserir dialect');
  }

  const dialectLine = `      <Environment name="${escapeXml(dialectEnvironmentName)}" type="java.lang.String" value="${escapeXml(dialect)}"/>\n\n      `;
  return content.slice(0, firstResource.index) + dialectLine + content.slice(firstResource.index);
}

function updateDocBase(content: string, docBase: string): string {
  const pattern = /(<Context\s+docBase=")([^"]*)(")/;
  if (!pattern.test(content)) {
    throw new Error('Atributo docBase nao encontrado no ROOT.xml');
  }
  return content.replace(pattern, `$1${escapeXml(docBase)}$3`);
}

function updateResourceBlock(content: string, resourceName: string, resource: DataSourceConfig): string {
  const escapedName = escapeRegex(resourceName);
  const blockPattern = new RegExp(`<Resource\\s+name="${escapedName}"[\\s\\S]*?/>`, 'm');
  const match = content.match(blockPattern);
  if (!match) {
    throw new Error(`Resource ${resourceName} nao encontrado no ROOT.xml`);
  }

  const indentMatch = match[0].match(/^(\s*)</);
  const indent = indentMatch?.[1] ?? '      ';
  const replacement = formatResource({ ...resource, name: resourceName }, indent);
  return content.replace(blockPattern, replacement);
}

export function createBackup(rootXmlPath: string, backupsDir: string, reason: string): string {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `ROOT-${timestamp}.xml`;
  const backupPath = path.join(backupsDir, fileName);
  fs.copyFileSync(rootXmlPath, backupPath);
  return backupPath;
}

export function updateDocBaseInFile(rootXmlPath: string, backupsDir: string, docBase: string, reason: string): {
  backupPath: string;
  content: string;
} {
  const backupPath = createBackup(rootXmlPath, backupsDir, reason);
  let content = fs.readFileSync(rootXmlPath, 'utf-8');
  content = updateDocBase(content, docBase);
  fs.writeFileSync(rootXmlPath, content, 'utf-8');
  return { backupPath, content };
}

export function updateDataSourceInFile(
  rootXmlPath: string,
  backupsDir: string,
  resourceName: string,
  resource: DataSourceConfig,
  reason: string
): { backupPath: string; content: string } {
  const backupPath = createBackup(rootXmlPath, backupsDir, reason);
  let content = fs.readFileSync(rootXmlPath, 'utf-8');
  content = updateResourceBlock(content, resourceName, resource);
  fs.writeFileSync(rootXmlPath, content, 'utf-8');
  return { backupPath, content };
}

export function applyClientProfileToFile(
  rootXmlPath: string,
  backupsDir: string,
  profile: ClientProfile,
  config: RootXmlConfig,
  targetDataSourceName: string,
  shouldUpdateDialect: boolean,
  reason: string
): { backupPath: string; content: string; dialectUpdated: boolean } {
  const backupPath = createBackup(rootXmlPath, backupsDir, reason);
  let content = fs.readFileSync(rootXmlPath, 'utf-8');
  const target = config.dataSources.find((item) => item.name === targetDataSourceName);

  if (!target) {
    throw new Error(`DataSource ${targetDataSourceName} nao encontrado no ROOT.xml`);
  }

  let dialectUpdated = false;
  const dialectEnvironmentName =
    config.environments.find((entry) => entry.value === config.hibernateDialect)?.name ??
    config.environments.find((entry) => entry.name.toLowerCase().includes('dialect'))?.name ??
    null;

  if (shouldUpdateDialect && dialectEnvironmentName && profile.dialect) {
    content = updateDialect(content, dialectEnvironmentName, profile.dialect);
    dialectUpdated = true;
  }

  const updatedTarget: DataSourceConfig = {
    ...target,
    username: profile.username,
    password: profile.password,
    url: profile.url,
    driverClassName: profile.driverClassName,
    validationQuery:
      profile.databaseType === 'oracle'
        ? target.validationQuery
        : profile.databaseType === 'hsql'
          ? 'select 1 from INFORMATION_SCHEMA.SYSTEM_USERS'
          : 'select 1'
  };

  content = updateResourceBlock(content, target.name, updatedTarget);
  fs.writeFileSync(rootXmlPath, content, 'utf-8');
  return { backupPath, content, dialectUpdated };
}

export function restoreBackup(rootXmlPath: string, backupPath: string, backupsDir: string): string {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup nao encontrado: ${backupPath}`);
  }
  createBackup(rootXmlPath, backupsDir, 'restore-previous');
  fs.copyFileSync(backupPath, rootXmlPath);
  return rootXmlPath;
}
