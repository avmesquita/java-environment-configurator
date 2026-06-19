import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseProfilesFromRootXmlContent } from './root-xml-comment-parser';
import { getPrimaryDataSource, parseRootXmlContent } from './root-xml-parser';

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<Context docBase="C:\\Projetos\\MyApp\\web\\target\\app" reloadable="true">
  <Environment name="com.example.app.hibernate.dialect" type="java.lang.String" value="org.hibernate.dialect.SQLServerDialect"/>
  <Resource name="jdbc/app-main" auth="Container" type="javax.sql.DataSource"
    maxTotal="10" maxIdle="10" maxWaitMillis="60000"
    username="app_user" password="secret" url="jdbc:sqlserver://localhost:1433;databaseName=app_db"
    driverClassName="com.microsoft.sqlserver.jdbc.SQLServerDriver"
    defaultAutoCommit="false" validationQuery="select 1"
    removeAbandonedTimeout="60" logAbandoned="true"
    testOnBorrow="true" removeAbandonedOnBorrow="true" removeAbandonedOnMaintenance="true" />
  <!--
    DEV => username="dev_user" password="dev_pass" url="jdbc:sqlserver://localhost:1433;databaseName=app_dev"
    QA => username="qa_user" password="qa_pass" url="jdbc:sqlserver://localhost:1433;databaseName=app_qa"
  -->
</Context>`;

describe('root-xml-parser', () => {
  it('parse docBase and datasource dynamically', () => {
    const config = parseRootXmlContent(sampleXml);
    assert.equal(config.docBase, 'C:\\Projetos\\MyApp\\web\\target\\app');
    assert.equal(config.hibernateDialect, 'org.hibernate.dialect.SQLServerDialect');

    const primary = getPrimaryDataSource(config);
    assert.ok(primary);
    assert.equal(primary?.name, 'jdbc/app-main');
    assert.equal(primary?.username, 'app_user');
  });
});

describe('root-xml-comment-parser', () => {
  it('imports profiles from xml comments', () => {
    const profiles = parseProfilesFromRootXmlContent(sampleXml);
    const codes = profiles.map((profile) => profile.code);
    assert.ok(codes.includes('DEV'));
    assert.ok(codes.includes('QA'));
    assert.ok(codes.includes('CURRENT'));
  });
});
