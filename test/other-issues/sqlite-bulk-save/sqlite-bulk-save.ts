import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";

describe("other issues > bulk save in sqlite", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["sqlite"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should save entities in bulk", () => Promise.all(connections.map(async function(connection) {

        // insert few posts first
        const posts: Post[] = [];
        for (let i = 1; i <= 10000; i++) {
            posts.push(new Post(i, "Post #" + i));
        }
        await connection.manager.save(posts);

    })));

});
