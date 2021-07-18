import {Post} from "./entity/Post";
import {Category} from "./entity/Category";
import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {Connection} from "../../../../../src/connection/Connection";
import {expect} from "chai";
import {PromiseUtils} from "../../../../../src";

describe("lazy-relations-loading-via-base-entity-finders", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        // we can properly test lazy-relations only on one platform
        enabledDrivers: ["mysql"]
    }));

    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("works", () => PromiseUtils.runInSequence(connections, async connection =>  {
        Category.useConnection(connection);
        Post.useConnection(connection);
        const category = new Category();
        category.name = "hello";
        await category.save();
        const post = new Post();
        post.title = "hello post";
        post.category = Promise.resolve(category);
        await post.save();
        expect((await Post.findOneOrFail({category})).id).equal(post.id);
        expect((await Post.findOneOrFail({category: {id: category.id}})).id).equal(post.id);
    }));
});
