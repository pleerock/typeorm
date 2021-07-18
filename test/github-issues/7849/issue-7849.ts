import "reflect-metadata";
import { expect } from "chai";
import { Connection } from "../../../src";
import { closeTestingConnections, createTestingConnections, reloadTestingDatabases } from "../../utils/test-utils";
import { OffsetWithoutLimitNotSupportedError } from "../../../src/error/OffsetWithoutLimitNotSupportedError";
import { TestEntity } from "./entity/test.entity";

const saveData = async (connection: Connection) => {
    const testEntityRepository = connection.getRepository(TestEntity);
    // save few documents
    const firstEntity = new TestEntity();
    firstEntity.id = 1;
    firstEntity.name = "Test";
    await testEntityRepository.save(firstEntity);

    const secondEntity = new TestEntity();
    secondEntity.id = 2;
    secondEntity.name = "Test";
    await testEntityRepository.save(secondEntity);
};

describe("github issues > #7849 Handle query builder to accomodate zero limit and zero offset for postgres driver", () => {
    
    let connections: Connection[];
    
    before(async () => {
        connections = await createTestingConnections({
            entities: [TestEntity],
            schemaCreate: true,
            dropSchema: true
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));
    
    it("should build query with limit 0 and offset 0", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(0).offset(0).orderBy("id").execute();
        expect(loadedEntities).to.be.an.instanceOf(Array);
        expect(loadedEntities.length).to.be.eql(0);
    })));

    it("should build query with limit 0 and offset 1", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(0).offset(1).orderBy("id").execute();
        expect(loadedEntities).to.be.an.instanceOf(Array);
        expect(loadedEntities.length).to.be.eql(0);
    })));

    it("should build query with limit 1 and offset 0", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(1).offset(0).orderBy("id").execute();
        expect(loadedEntities).to.be.an.instanceOf(Array);
        expect(loadedEntities.length).to.be.eql(1);
        expect(loadedEntities[0].id).to.be.eql(1);
    })));

    it("should build query with limit 1 and offset 1", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(1).offset(1).orderBy("id").execute();
        expect(loadedEntities.length).to.be.eql(1);
        expect(loadedEntities[0].id).to.be.eql(2);
    })));
    it("should build query with undefined limit", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(undefined).execute();
        expect(loadedEntities.length).to.be.eql(2);
    })));
    it("should build query with undefined offset", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(undefined).execute();
        expect(loadedEntities.length).to.be.eql(2);
    })));
    it("should build query with negative limit", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(-1).execute();
        expect(loadedEntities.length).to.be.eql(2);
    })));
    it("should build query with null limit", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(null as any).execute();
        expect(loadedEntities.length).to.be.eql(2);
    })));
    it("should build query with positive limit", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(1).execute();
        expect(loadedEntities.length).to.be.eql(1);
    })));

    it("should build query with negative offset", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(-1).execute();
        expect(loadedEntities.length).to.be.eql(2);
    })));
    it("should build query with null offset", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").limit(null as any).execute();
        expect(loadedEntities.length).to.be.eql(2);
    })));
});

describe("github issues > #7849 Handle query builder to have only offset for mysql, aurora-data-api, sap driver", () => {
    
    let connections: Connection[];
    
    before(async () => {
        connections = await createTestingConnections({
            enabledDrivers: ["mysql", "aurora-data-api", "sap"],
            entities: [TestEntity],
            schemaCreate: true,
            dropSchema: true
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));
    
    it("should throw error", () => Promise.all(connections.map(async connection => {
        try {
            await saveData(connection);
            await connection.createQueryBuilder().from("test", "test").offset(1).execute();
        } catch (e) {
            expect(e).to.be.an.instanceOf(OffsetWithoutLimitNotSupportedError);
        }
    })));
});

describe("github issues > #7849 Handle query builder to have only offset except mysql, aurora-data-api, sap driver", () => {
    
    let connections: Connection[];
    
    before(async () => {
        connections = await createTestingConnections({
            enabledDrivers: ["better-sqlite3", "capacitor", "cockroachdb", "cordova", "expo", "mariadb", "mongodb", "mssql", "nativescript", "oracle", "postgres", "react-native", "sqlite", "sqljs"],
            entities: [TestEntity],
            schemaCreate: true,
            dropSchema: true
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));
    
    it("should build query with positive offset", () => Promise.all(connections.map(async connection => {
        await saveData(connection);
        const loadedEntities = await connection.createQueryBuilder().from("test", "test").offset(1).execute();
        expect(loadedEntities.length).to.be.eql(1);
    })));
});
