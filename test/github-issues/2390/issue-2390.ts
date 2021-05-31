import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Post} from "./entity/Post";
import {Connection, In} from "../../../src";

describe("github issues > #2390 find with In operator by property with transformer", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should find with In operator by fields with transformer", () => Promise.all(connections.map(async connection => {
        const ids = ["first", "second"];

        const post1 = new Post(ids[0]);
        post1.title = "post #1";
        await connection.manager.save(post1);

        const post2 = new Post(ids[1]);
        post1.title = "post #2";
        await connection.manager.save(post2);

        const posts = await connection.getRepository(Post).find({
            id: In(ids)
        });

        posts.length.should.be.equal(ids.length);
        posts.map(post => post.id).should.be.eql(ids);
    })));

});
