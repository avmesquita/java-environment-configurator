import * as fs from 'fs';
import * as path from 'path';
import { AppSettings } from './types';

const ROOT_XML_RELATIVE = path.join('conf', 'Catalina', 'localhost', 'ROOT.xml');

export function resolveRootXmlPath(settings?: Partial<AppSettings>): string | null {
  if (settings?.customRootXmlPath && fs.existsSync(settings.customRootXmlPath)) {
    return settings.customRootXmlPath;
  }

  if (settings?.tomcatRootXmlPath && fs.existsSync(settings.tomcatRootXmlPath)) {
    return settings.tomcatRootXmlPath;
  }

  const catalinaBase = settings?.catalinaBase ?? process.env.CATALINA_BASE ?? null;
  if (catalinaBase) {
    const candidate = path.join(catalinaBase, ROOT_XML_RELATIVE);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const catalinaHome = settings?.catalinaHome ?? process.env.CATALINA_HOME ?? null;
  if (catalinaHome) {
    const candidate = path.join(catalinaHome, ROOT_XML_RELATIVE);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function detectTomcatEnv(): { catalinaBase: string | null; catalinaHome: string | null } {
  return {
    catalinaBase: process.env.CATALINA_BASE ?? null,
    catalinaHome: process.env.CATALINA_HOME ?? null
  };
}

export function defaultRootXmlPath(): string {
  return path.join('C:', 'apache-tomcat-9.0.117', 'conf', 'Catalina', 'localhost', 'ROOT.xml');
}
