import "reflect-metadata";
import { createTestingConnections, closeTestingConnections, reloadTestingDatabases } from "../../utils/test-utils";
import { Connection } from "../../../src/connection/Connection";
import { expect } from "chai";
describe("github issues > #2737 sync schema on columns without precision, width or default value set to null", () => {
    let connections: Connection[];
    it("MySQL, MariaDb, Oracle", async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/MySQLDummy{.js,.ts}"],
            schemaCreate: true,
            dropSchema: true,
            enabledDrivers: ["mysql", "mariadb", "oracle"],
        });
        await reloadTestingDatabases(connections);
        await Promise.all(connections.map(async connection => {
            const schemaBuilder = connection.driver.createSchemaBuilder();
            const syncQueries = await schemaBuilder.log();
            expect(syncQueries.downQueries).to.be.empty;
            expect(syncQueries.upQueries).to.be.empty;
        }));
        await closeTestingConnections(connections);
    });
    it("MSSQL, Sqljs, Sqlite", async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/MSSQLDummy{.js,.ts}"],
            schemaCreate: true,
            dropSchema: true,
            enabledDrivers: ["mssql", "sqljs", "sqlite"],
        });
        await reloadTestingDatabases(connections);
        await Promise.all(connections.map(async connection => {
            const schemaBuilder = connection.driver.createSchemaBuilder();
            const syncQueries = await schemaBuilder.log();
            expect(syncQueries.downQueries).to.be.empty;
            expect(syncQueries.upQueries).to.be.empty;
        }));
        await closeTestingConnections(connections);
    });
    it("Postgres", async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/PostgresDummy{.js,.ts}"],
            schemaCreate: true,
            dropSchema: true,
            enabledDrivers: ["postgres"],
        });
        await reloadTestingDatabases(connections);
        await Promise.all(connections.map(async connection => {
            const schemaBuilder = connection.driver.createSchemaBuilder();
            const syncQueries = await schemaBuilder.log();
            expect(syncQueries.downQueries).to.be.empty;
            expect(syncQueries.upQueries).to.be.empty;
        }));
        await closeTestingConnections(connections);
    });
});
