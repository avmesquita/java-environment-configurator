# Java Environment Configurator
[![CI](https://github.com/avmesquita/java-environment-configurator/actions/workflows/ci.yml/badge.svg)](https://github.com/avmesquita/java-environment-configurator/actions/workflows/ci.yml)
[![Release](https://github.com/avmesquita/java-environment-configurator/actions/workflows/release.yml/badge.svg)](https://github.com/avmesquita/java-environment-configurator/actions/workflows/release.yml)

Aplicativo desktop (Angular 20 + Electron) e CLI (`pkg`) para leitura e escrita do `ROOT.xml` do Tomcat, com foco em:

- atributo `docBase` (pasta do projeto)
- conexoes de banco (DataSources JDBC e dialect Hibernate)
- perfis de ambiente persistidos em SQLite local

Repositorio: https://github.com/avmesquita/java-environment-configurator

## Estrutura

```
packages/core   # parser/writer XML, SQLite, perfis
apps/desktop    # UI Electron + Angular 20
apps/cli        # CLI empacotavel com pkg
```

## Pre-requisitos

- Node.js 20+
- npm 10+
- Tomcat com `ROOT.xml` acessivel via `CATALINA_BASE`, `CATALINA_HOME` ou caminho manual

## Instalacao

```bash
npm install
npm run build
```

## Desenvolvimento desktop

```bash
npm run start:desktop
```

Fluxo:

1. build Angular (development)
2. compila Electron
3. abre janela Electron

Para testar so a UI no navegador:

```bash
npm run serve -w @avm/desktop
```

## CLI

```bash
npm run build:cli
npm run start:cli -- show
npm run start:cli -- profiles list
npm run start:cli -- profiles import
npm run start:cli -- apply LOCAL_DEV
npm run start:cli -- backup
npm run start:cli -- settings set --root-xml "C:\apache-tomcat\conf\Catalina\localhost\ROOT.xml"
```

Empacotar CLI:

```bash
npm run package:cli
```

Binarios gerados em `release/cli/` (`avm-config`).

## Desktop release

```bash
npm run package:desktop
```

Artefatos gerados em `release/desktop/`.

## Resolucao do ROOT.xml

Ordem:

1. caminho manual (`customRootXmlPath`) salvo no SQLite
2. `CATALINA_BASE/conf/Catalina/localhost/ROOT.xml`
3. `CATALINA_HOME/conf/Catalina/localhost/ROOT.xml`

## Backups

Toda escrita no `ROOT.xml` cria backup automatico em:

`%USERPROFILE%\.avm-environment-configurator\backups\`

Historico tambem fica registrado no SQLite local.

## Perfis de ambiente

Nenhum dado sensivel fica no repositorio publico.

- **Primeira execucao sem ROOT.xml:** cria apenas o perfil ficticio `LOCAL_DEV` (`localhost`, usuario/senha de exemplo).
- **Primeira execucao com ROOT.xml configurado:** importa automaticamente perfis dos comentarios XML e um snapshot `CURRENT` da conexao ativa.
- **Importacao manual:** botao **Importar do ROOT.xml** na tela Perfis, ou CLI `avm-config profiles import`.

Dialect, nomes de `Environment` e `Resource` JDBC sao lidos dinamicamente do arquivo ? nada disso fica hardcoded no codigo.

## CI/CD

- `CI`: build em push/PR (`main`)
- `Release`: tag `v*` publica artefatos desktop + CLI no GitHub Releases

Exemplo:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Banco local

Arquivo SQLite:

`%USERPROFILE%\.avm-environment-configurator\avm-environment-configurator.db`

## Nota sobre chaves do ROOT.xml

A ferramenta le e grava o que existir no seu `ROOT.xml` (nomes de `Environment`, `Resource`, dialect Hibernate). Esses identificadores pertencem ao seu ambiente e nao sao embutidos no codigo-fonte publico.
