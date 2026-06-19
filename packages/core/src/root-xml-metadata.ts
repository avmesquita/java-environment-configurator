import { DataSourceConfig, DatabaseType, EnvironmentEntry, RootXmlConfig } from './types';

export interface RootXmlMetadata {
  dialectEnvironmentName: string | null;
  primaryDataSourceName: string | null;
  secondaryDataSourceNames: string[];
}

export function findDialectEnvironment(environments: EnvironmentEntry[]): EnvironmentEntry | null {
  return (
    environments.find((entry) => {
      const name = entry.name.toLowerCase();
      return name.includes('hibernate.dialect') || name.endsWith('.dialect');
    }) ?? null
  );
}

export function resolveRootXmlMetadata(config: RootXmlConfig): RootXmlMetadata {
  const dialectEntry = findDialectEnvironment(config.environments);
  const primary = config.dataSources[0] ?? null;
  const secondary = config.dataSources.slice(1);

  return {
    dialectEnvironmentName: dialectEntry?.name ?? null,
    primaryDataSourceName: primary?.name ?? null,
    secondaryDataSourceNames: secondary.map((ds) => ds.name)
  };
}

export function getPrimaryDataSource(config: RootXmlConfig): DataSourceConfig | null {
  return config.dataSources[0] ?? null;
}

export function getSecondaryDataSources(config: RootXmlConfig): DataSourceConfig[] {
  return config.dataSources.slice(1);
}

export function inferDatabaseType(url: string, driverClassName: string): DatabaseType {
  const value = `${url} ${driverClassName}`.toLowerCase();
  if (value.includes('oracle')) {
    return 'oracle';
  }
  if (value.includes('hsqldb') || value.includes('hsql')) {
    return 'hsql';
  }
  return 'sqlserver';
}

export function inferDriverClassName(url: string, current?: string): string {
  if (current) {
    return current;
  }

  const value = url.toLowerCase();
  if (value.includes('oracle')) {
    return 'oracle.jdbc.OracleDriver';
  }
  if (value.includes('hsqldb') || value.includes('hsql')) {
    return 'org.hsqldb.jdbc.JDBCDriver';
  }
  if (value.includes('jtds')) {
    return 'net.sourceforge.jtds.jdbc.Driver';
  }
  if (value.includes('sqlserver')) {
    return 'com.microsoft.sqlserver.jdbc.SQLServerDriver';
  }
  return 'javax.sql.Driver';
}

export function inferDatabaseName(url: string): string {
  const jtdsMatch = url.match(/\/([^/;?]+)(?:;|$)/i);
  if (jtdsMatch?.[1]) {
    return jtdsMatch[1];
  }

  const dbNameMatch = url.match(/databaseName=([^;]+)/i);
  if (dbNameMatch?.[1]) {
    return dbNameMatch[1];
  }

  const oracleMatch = url.match(/:@([^:/]+)(?::|\/|$)/i);
  if (oracleMatch?.[1]) {
    return oracleMatch[1];
  }

  return 'app_db';
}
