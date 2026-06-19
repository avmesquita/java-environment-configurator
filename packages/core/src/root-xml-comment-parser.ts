import * as fs from 'fs';
import {
  inferDatabaseName,
  inferDatabaseType,
  inferDriverClassName,
  findDialectEnvironment
} from './root-xml-metadata';
import { parseRootXmlContent } from './root-xml-parser';
import { DatabaseType } from './types';

export interface ParsedCommentProfile {
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

function extractCommentBlocks(content: string): string[] {
  const blocks: string[] = [];
  const pattern = /<!--([\s\S]*?)-->/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

function parseAttributeMap(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

function parseInlineProfiles(block: string, defaultDialect: string | null): ParsedCommentProfile[] {
  const profiles: ParsedCommentProfile[] = [];
  const codePattern = /^\s*([A-Z][A-Z0-9_]*)\s*=>/gm;
  const matches = [...block.matchAll(codePattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const start = current.index ?? 0;
    const end = next?.index ?? block.length;
    const section = block.slice(start, end);
    const attrs = parseAttributeMap(section);
    const url = attrs.url ?? '';

    if (!url || !attrs.username) {
      continue;
    }

    const code = current[1];
    profiles.push({
      code,
      name: code.replace(/_/g, ' '),
      databaseType: inferDatabaseType(url, attrs.driverClassName ?? ''),
      dialect: defaultDialect ?? '',
      username: attrs.username,
      password: attrs.password ?? '',
      url,
      driverClassName: inferDriverClassName(url, attrs.driverClassName),
      databaseName: inferDatabaseName(url),
      notes: 'Importado de comentario do ROOT.xml'
    });
  }

  return profiles;
}

function parseCommentedResourceBlocks(block: string, defaultDialect: string | null): ParsedCommentProfile[] {
  const profiles: ParsedCommentProfile[] = [];
  const resourcePattern = /<Resource\b[\s\S]*?\/>/gi;
  const matches = block.match(resourcePattern) ?? [];

  for (const resourceXml of matches) {
    const attrs = parseAttributeMap(resourceXml);
    const url = attrs.url ?? '';
    if (!url || !attrs.username) {
      continue;
    }

    const rawName = attrs.name ?? 'IMPORTED';
    const code = rawName.replace(/^jdbc\//, '').replace(/[^\w]+/g, '_').toUpperCase();

    profiles.push({
      code,
      name: rawName,
      databaseType: inferDatabaseType(url, attrs.driverClassName ?? ''),
      dialect: defaultDialect ?? '',
      username: attrs.username,
      password: attrs.password ?? '',
      url,
      driverClassName: inferDriverClassName(url, attrs.driverClassName),
      databaseName: inferDatabaseName(url),
      notes: 'Importado de bloco comentado no ROOT.xml'
    });
  }

  return profiles;
}

export function parseProfilesFromRootXmlContent(content: string): ParsedCommentProfile[] {
  const activeConfig = parseRootXmlContent(content);
  const dialectEntry = findDialectEnvironment(activeConfig.environments);
  const defaultDialect = dialectEntry?.value ?? activeConfig.hibernateDialect;
  const blocks = extractCommentBlocks(content);
  const byCode = new Map<string, ParsedCommentProfile>();

  for (const block of blocks) {
    const inlineProfiles = parseInlineProfiles(block, defaultDialect);
    const resourceProfiles = parseCommentedResourceBlocks(block, defaultDialect);

    for (const profile of [...inlineProfiles, ...resourceProfiles]) {
      byCode.set(profile.code, profile);
    }
  }

  const primary = activeConfig.dataSources[0];
  if (primary?.username && primary.url) {
    byCode.set('CURRENT', {
      code: 'CURRENT',
      name: 'Configuracao atual',
      databaseType: inferDatabaseType(primary.url, primary.driverClassName),
      dialect: defaultDialect ?? '',
      username: primary.username,
      password: primary.password,
      url: primary.url,
      driverClassName: inferDriverClassName(primary.url, primary.driverClassName),
      databaseName: inferDatabaseName(primary.url),
      notes: 'Snapshot da conexao ativa no ROOT.xml'
    });
  }

  return [...byCode.values()].sort((left, right) => left.code.localeCompare(right.code));
}

export function parseProfilesFromRootXmlFile(rootXmlPath: string): ParsedCommentProfile[] {
  const content = fs.readFileSync(rootXmlPath, 'utf-8');
  return parseProfilesFromRootXmlContent(content);
}
