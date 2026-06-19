import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { findDialectEnvironment } from './root-xml-metadata';
import { DataSourceConfig, EnvironmentEntry, RootXmlConfig } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  commentPropName: '#comment',
  preserveOrder: false,
  trimValues: true
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseResource(resource: Record<string, string>): DataSourceConfig {
  return {
    name: resource.name ?? '',
    auth: resource.auth ?? 'Container',
    type: resource.type ?? 'javax.sql.DataSource',
    maxTotal: resource.maxTotal ?? '10',
    maxIdle: resource.maxIdle ?? '10',
    maxWaitMillis: resource.maxWaitMillis ?? '60000',
    username: resource.username ?? '',
    password: resource.password ?? '',
    url: resource.url ?? '',
    driverClassName: resource.driverClassName ?? '',
    defaultAutoCommit: resource.defaultAutoCommit ?? 'false',
    validationQuery: resource.validationQuery,
    removeAbandonedTimeout: resource.removeAbandonedTimeout,
    logAbandoned: resource.logAbandoned,
    testOnBorrow: resource.testOnBorrow,
    removeAbandonedOnBorrow: resource.removeAbandonedOnBorrow,
    removeAbandonedOnMaintenance: resource.removeAbandonedOnMaintenance
  };
}

function parseEnvironment(entry: Record<string, string>): EnvironmentEntry {
  return {
    name: entry.name ?? '',
    type: entry.type ?? 'java.lang.String',
    value: entry.value ?? ''
  };
}

export function parseRootXmlFile(rootXmlPath: string): RootXmlConfig {
  const content = fs.readFileSync(rootXmlPath, 'utf-8');
  return parseRootXmlContent(content, rootXmlPath);
}

export function parseRootXmlContent(content: string, rawPath = ''): RootXmlConfig {
  const parsed = parser.parse(content);
  const context = parsed.Context ?? parsed.context;

  if (!context) {
    throw new Error('Elemento Context nao encontrado no ROOT.xml');
  }

  const docBase = context.docBase ?? '';
  const reloadable = context.reloadable ?? 'true';
  const environments = asArray(context.Environment).map(parseEnvironment);
  const dialectEntry = findDialectEnvironment(environments);
  const dataSources = asArray(context.Resource).map(parseResource);

  return {
    docBase,
    reloadable,
    hibernateDialect: dialectEntry?.value ?? null,
    dataSources,
    environments,
    rawPath
  };
}

export { getPrimaryDataSource, getSecondaryDataSources } from './root-xml-metadata';
