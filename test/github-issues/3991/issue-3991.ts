import "reflect-metadata";
import {Connection} from "../../../src";
import {createTestingConnections, closeTestingConnections} from "../../utils/test-utils";
import {Post as CockroachPost} from "./entity/cockroachdb/Post";
import {Post as PostgresPost} from "./entity/postgres/Post";
import {Post as OraclePost} from "./entity/oracle/Post";
import {Post as SqlitePost} from "./entity/sqlite/Post";
import {Post as OtherPost} from "./entity/other/Post";

describe.only("github issues > #3991 Migration keeps changing @CreateDateColumn/@UpdateDateColumn timestamp column to same definition", () => {
    describe("postgres", () => {
        let connections: Connection[];
        before(async () => connections = await createTestingConnections({
            enabledDrivers: ["postgres"],
            schemaCreate: false,
            dropSchema: true,
            entities: [PostgresPost],
        }));
        after(() => closeTestingConnections(connections));

        it("should recognize model changes", () => Promise.all(connections.map(async connection => {
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.greaterThan(0);
            sqlInMemory.downQueries.length.should.be.greaterThan(0);
        })));

        it("should not generate queries when no model changes", () => Promise.all(connections.map(async connection => {
            await connection.driver.createSchemaBuilder().build();
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.equal(0);
            sqlInMemory.downQueries.length.should.be.equal(0);
        })));
    })

    describe("cockroachdb", () => {
        let connections: Connection[];
        before(async () => connections = await createTestingConnections({
            enabledDrivers: ["cockroachdb"],
            schemaCreate: false,
            dropSchema: true,
            entities: [CockroachPost],
        }));
        after(() => closeTestingConnections(connections));

        it("should recognize model changes", () => Promise.all(connections.map(async connection => {
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.greaterThan(0);
            sqlInMemory.downQueries.length.should.be.greaterThan(0);
        })));

        it("should not generate queries when no model changes", () => Promise.all(connections.map(async connection => {
            await connection.driver.createSchemaBuilder().build();
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.equal(0);
            sqlInMemory.downQueries.length.should.be.equal(0);
        })));
    })

    describe("oracle", () => {
        let connections: Connection[];
        before(async () => connections = await createTestingConnections({
            enabledDrivers: ["oracle"],
            schemaCreate: false,
            dropSchema: true,
            entities: [OraclePost],
        }));
        after(() => closeTestingConnections(connections));

        it("should recognize model changes", () => Promise.all(connections.map(async connection => {
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.greaterThan(0);
            sqlInMemory.downQueries.length.should.be.greaterThan(0);
        })));

        it("should not generate queries when no model changes", () => Promise.all(connections.map(async connection => {
            await connection.driver.createSchemaBuilder().build();
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.equal(0);
            sqlInMemory.downQueries.length.should.be.equal(0);
        })));
    })

    describe("sqlite", () => {
        let connections: Connection[];
        before(async () => connections = await createTestingConnections({
            enabledDrivers: ["sqlite"],
            schemaCreate: false,
            dropSchema: true,
            entities: [SqlitePost],
        }));
        after(() => closeTestingConnections(connections));

        it("should recognize model changes", () => Promise.all(connections.map(async connection => {
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.greaterThan(0);
            sqlInMemory.downQueries.length.should.be.greaterThan(0);
        })));

        it("should not generate queries when no model changes", () => Promise.all(connections.map(async connection => {
            await connection.driver.createSchemaBuilder().build();
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.equal(0);
            sqlInMemory.downQueries.length.should.be.equal(0);
        })));
    })

    describe("mysql, mssql", () => {
        let connections: Connection[];
        before(async () => connections = await createTestingConnections({
            enabledDrivers: ["mysql", "mssql"],
            schemaCreate: false,
            dropSchema: true,
            entities: [OtherPost],
        }));
        after(() => closeTestingConnections(connections));

        it("should recognize model changes", () => Promise.all(connections.map(async connection => {
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            sqlInMemory.upQueries.length.should.be.greaterThan(0);
            sqlInMemory.downQueries.length.should.be.greaterThan(0);
        })));

        it("should not generate queries when no model changes", () => Promise.all(connections.map(async connection => {
            await connection.driver.createSchemaBuilder().build();
            const sqlInMemory = await connection.driver.createSchemaBuilder().log();
            console.log(sqlInMemory);
            sqlInMemory.upQueries.length.should.be.equal(0);
            sqlInMemory.downQueries.length.should.be.equal(0);
        })));
    })
});
