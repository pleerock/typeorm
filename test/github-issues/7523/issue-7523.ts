import "reflect-metadata";
import {expect} from "chai";
import {Connection} from "../../../src";
import {createTestingConnections, closeTestingConnections} from "../../utils/test-utils";
import {ChildEntity1, ChildEntity2} from "./entity/Test";

describe("github issues > #7523 Do not create duplicate CREATE TYPE migration query when same 'enumName's are exists", () => {
    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        enabledDrivers: ["postgres"],
        schemaCreate: false,
        dropSchema: true,
        entities: [ChildEntity1, ChildEntity2],
    }));
    after(() => closeTestingConnections(connections));

    it("should not generate duplicate CREATE TYPE query", () => Promise.all(connections.map(async connection => {
        const sqlInMemory = await connection.driver.createSchemaBuilder().log();
        expect(sqlInMemory.upQueries.length).equals(3);
        expect(sqlInMemory.downQueries.length).equals(3);
    })));

    it("should not generate queries when no model changes", () => Promise.all(connections.map(async connection => {
        await connection.driver.createSchemaBuilder().build();
        const sqlInMemory = await connection.driver.createSchemaBuilder().log();
        expect(sqlInMemory.upQueries.length).equals(0);
        expect(sqlInMemory.downQueries.length).equals(0);
    })));
});
