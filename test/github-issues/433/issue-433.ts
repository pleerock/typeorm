import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";

describe("github issues > #433 default value (json) is not getting set in postgreSQL", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["postgres"],
        schemaCreate: true,
        dropSchemaOnConnection: true,
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should successfully set default value in to JSON type column", () => Promise.all(connections.map(async connection => {
        const post = new Post();
        post.id = 1;
        await connection.getRepository(Post).persist(post);
        const loadedPost = (await connection.getRepository(Post).findOneById(1))!;
        loadedPost.json.should.be.eql({ hello: "world" });
    })));

});
