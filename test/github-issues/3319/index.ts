import "reflect-metadata";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";
import {expect} from "chai";

describe("github issues > #3319 No data returned due to case sensitivity in sql to entity transformer (RawSqlResultsToEntityTransformer)", () => {
    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        schemaCreate: true,
        dropSchema: true,
        enabledDrivers: [
            "postgres"
        ]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should retreive an inserted entity", () => Promise.all(connections.map(async connection => {
        const repo = connection.getRepository(Post);
        const post = new Post();
        post.id = 12;

        repo.save(post);

        const loadedPosts = await repo.find();

        expect(loadedPosts).to.length(1);
    })));
});
