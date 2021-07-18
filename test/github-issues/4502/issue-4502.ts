import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";
import {expect} from "chai";
import {Category} from "./entity/Category";

describe("github issues > #4502 Lazy relations cannot be read immediately after being setup", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["mysql"] // we can properly test lazy-relations only on one platform
        // enabledDrivers: [] // we don't need to connect to DB to test this
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should be able to read lazy ManyToOne relations just after relation being initialized", async () => {
        const category1 = new Category();
        category1.name = "category #1";

        const post1 = new Post();
        post1.title = "Hello Post #1";
        post1.category = Promise.resolve(category1);

        expect(await post1.category).to.be.equal(category1);
    });

    it("should be able to read lazy OneToMany relations just after relation being initialized", async () => {
        const post1 = new Post();
        post1.title = "Hello Post #1";
        const post2 = new Post();
        post2.title = "Hello Post #2";

        const category1 = new Category();
        category1.name = "category #1";
        category1.posts = Promise.resolve([post1, post2]);

        expect(await category1.posts).to.be.equal([post1, post2]);
    });
});
