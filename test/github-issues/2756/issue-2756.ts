import "reflect-metadata";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";

import {Post} from "./entity/post.entity";
import {expect} from "chai";

describe("github issues > #2756 The field with a default value", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        migrations: [__dirname + "/migration/*.js"],
        enabledDrivers: ["postgres"],
        schemaCreate: true,
        dropSchema: true,
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should leave the default value unmodified", () => Promise.all(connections.map(async connection => {
        const [lastMigration] = await connection.runMigrations();

        lastMigration.should.have.property("timestamp", 1567689639608);
        lastMigration.should.have.property("name", "DefaultValueAtColumn1567689639608");

        const post = new Post();
        post.title = "Super title";
        const result = await connection.manager.save(post);

        expect(result).not.to.be.empty;
        expect(result!.title).not.to.be.empty;
        result!.title.should.be.equal("Super title");

        expect(result!.incr, "incr field is present").not.to.be.empty;
        expect(result!.incr).to.be.equal(10);

    })));
});
