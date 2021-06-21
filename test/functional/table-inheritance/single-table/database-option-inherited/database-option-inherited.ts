import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {Connection} from "../../../../../src";

describe("table-inheritance > single-table > database-option-inherited", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        // creating more databases isn't always possible(e.g oracle official docker images)
        enabledDrivers: ["postgres", "cockroachdb", "mariadb", "mssql", "mysql", "sqlite", "better-sqlite3", "sqljs"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should correctly inherit database option", () => Promise.all(connections.map(async connection => {

        connection.entityMetadatas.forEach(metadata => {
            if ((<any>connection.options).skip) return
            metadata.database!.should.equal("test");
        })

    })));
});
