import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";

describe("other issues > hydration performance", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["mysql"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("if entity was changed in the listener, changed property should be updated in the db", () => Promise.all(connections.map(async function(connection) {

        // insert few posts first
        const posts: Post[] = [];
        for (let i = 1; i <= 100000; i++) {
            posts.push(new Post("Post #" + i));
        }
        await connection.manager.insert(Post, posts, {reload: false});

        // select them using raw sql
        // console.time("select using raw sql");
        const loadedRawPosts = await connection.manager.query("SELECT * FROM post");
        loadedRawPosts.length.should.be.equal(100000);
        // console.timeEnd("select using raw sql");

        // now select them using ORM
        // console.time("select using ORM");
        const loadedOrmPosts = await connection.manager.find(Post);
        loadedOrmPosts.length.should.be.equal(100000);
        // console.timeEnd("select using ORM");

    })));

});
