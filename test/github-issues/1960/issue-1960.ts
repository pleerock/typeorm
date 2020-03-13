import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src";

// TODO: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_explicit_defaults_for_timestamp
describe.skip("github issues > #1960 Migration generator produces duplicated changes", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["mysql"],
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should not execute any alter queries", () => Promise.all(connections.map(async function(connection) {
        const sqlInMemory = await connection.driver.createSchemaBuilder().log();
        sqlInMemory.upQueries.length.should.be.equal(0);
    })));

});
