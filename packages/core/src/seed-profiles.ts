import { DatabaseType } from './types';

interface SeedProfile {
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

export const defaultProfiles: SeedProfile[] = [];

export function createLocalDemoProfile(): SeedProfile {
  return {
    code: 'LOCAL_DEV',
    name: 'Desenvolvimento local',
    databaseType: 'sqlserver',
    dialect: 'org.hibernate.dialect.SQLServerDialect',
    username: 'app_user',
    password: 'change_me',
    url: 'jdbc:sqlserver://localhost:1433;databaseName=app_db',
    driverClassName: 'com.microsoft.sqlserver.jdbc.SQLServerDriver',
    databaseName: 'app_db',
    notes: 'Perfil ficticio inicial. Substitua ou importe perfis do ROOT.xml.'
  };
}
