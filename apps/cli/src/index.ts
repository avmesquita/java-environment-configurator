#!/usr/bin/env node

import { AvmDatabase, getPrimaryDataSource, getSecondaryDataSources } from '@avm/core';

function printUsage(): void {
  console.log(`Java Environment Configurator CLI

Uso:
  avm-config show
  avm-config profiles list
  avm-config profiles import
  avm-config apply <CODIGO_PERFIL> --datasource <NOME> [--update-dialect]
  avm-config backup
  avm-config settings show
  avm-config settings set --root-xml <CAMINHO>
  avm-config settings set --catalina-base <CAMINHO>
  avm-config settings set --catalina-home <CAMINHO>
`);
}

function parseArgs(argv: string[]): { command: string; subcommand?: string; positional: string[]; options: Record<string, string> } {
  const args = [...argv];
  const options: Record<string, string> = {};
  const positional: string[] = [];

  while (args.length > 0) {
    const current = args.shift()!;
    if (current.startsWith('--')) {
      const key = current.slice(2);
      const value = args[0] && !args[0].startsWith('--') ? args.shift()! : 'true';
      options[key] = value;
      continue;
    }
    positional.push(current);
  }

  return {
    command: positional[0] ?? '',
    subcommand: positional[1],
    positional,
    options
  };
}

function run(): number {
  const parsed = parseArgs(process.argv.slice(2));
  const db = new AvmDatabase();

  try {
    switch (parsed.command) {
      case 'show': {
        const config = db.readRootXmlConfig();
        const primary = getPrimaryDataSource(config);
        const secondary = getSecondaryDataSources(config);
        console.log(JSON.stringify({ config, primary, secondary }, null, 2));
        return 0;
      }
      case 'profiles': {
        if (parsed.subcommand === 'list') {
          console.log(JSON.stringify(db.listProfiles(), null, 2));
          return 0;
        }
        if (parsed.subcommand === 'import') {
          const result = db.importProfilesFromRootXml();
          console.log(JSON.stringify(result, null, 2));
          return 0;
        }
        console.error('Subcomando profiles invalido. Use: profiles list | profiles import');
        return 1;
      }
      case 'apply': {
        const code = parsed.subcommand;
        if (!code) {
          console.error('Informe o codigo do perfil. Ex: apply LOCAL_DEV --datasource jdbc/logone');
          return 1;
        }
        const dataSourceName = parsed.options['datasource'];
        if (!dataSourceName) {
          const config = db.readRootXmlConfig();
          const fallback = config.dataSources[0]?.name;
          if (!fallback) {
            console.error('Informe --datasource <NOME>. Nenhum Resource JDBC encontrado no ROOT.xml.');
            return 1;
          }
          console.warn(`DataSource nao informado. Usando: ${fallback}`);
          const result = db.applyProfile(code, fallback, parsed.options['update-dialect'] === 'true');
          console.log(JSON.stringify(result, null, 2));
          return 0;
        }
        const result = db.applyProfile(code, dataSourceName, parsed.options['update-dialect'] === 'true');
        console.log(JSON.stringify(result, null, 2));
        return 0;
      }
      case 'backup': {
        const result = db.createManualBackup('cli-manual-backup');
        console.log(JSON.stringify(result, null, 2));
        return 0;
      }
      case 'settings': {
        if (parsed.subcommand === 'show') {
          console.log(JSON.stringify(db.getSettings(), null, 2));
          return 0;
        }
        if (parsed.subcommand === 'set') {
          db.updateSettings({
            customRootXmlPath: parsed.options['root-xml'],
            catalinaBase: parsed.options['catalina-base'],
            catalinaHome: parsed.options['catalina-home']
          });
          console.log(JSON.stringify(db.getSettings(), null, 2));
          return 0;
        }
        console.error('Subcomando settings invalido. Use: settings show | settings set');
        return 1;
      }
      default:
        printUsage();
        return parsed.command ? 1 : 0;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro: ${message}`);
    return 1;
  } finally {
    db.close();
  }
}

process.exit(run());
