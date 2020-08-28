import "reflect-metadata";
import { expect } from "chai";
import { Connection } from "../../../src";
import { closeTestingConnections, createTestingConnections, reloadTestingDatabases } from "../../utils/test-utils";
import { Post } from "../4440/entity/Post";

describe.only("github issues > #6633 Fulltext indices continually dropped & re-created", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [Post],
            schemaCreate: true,
            dropSchema: true
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should not create migrations for fulltext indices", () =>
        Promise.all(connections.map(async (connection) => {
                const sqlInMemory = await connection.driver.createSchemaBuilder().log();

                expect(sqlInMemory.upQueries).to.eql([]);
                expect(sqlInMemory.downQueries).to.eql([]);
            }
        ))
    );
});
