import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src";
import {Post} from "./entity/Post";
import {expect} from "chai";
import {User} from "./entity/User";
import {Comment} from "./entity/Comment";


describe("github issues > #296 select additional computed columns", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["mysql"] // we can properly test lazy-relations only on one platform
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("github issues > #296 should correctly select computed columns and mapping inside entity values", () => Promise.all(connections.map(async connection => {
        const user1 = new User();
        user1.name = "Antonio";
        user1.surname = "Duprez";
        await connection.manager.save(user1);

        const user2 = new User();
        user2.name = "Sebastian";
        user2.surname = "Gomez";
        await connection.manager.save(user2);

        const post = new Post();
        post.title = "Implement addSelectAndMap in TypeORM";
        post.userId = user1.id;
        await connection.manager.save(post);

        const comment1 = new Comment();
        comment1.userId = user1.id;
        comment1.comment = "Amazing!";
        comment1.postId = post.id;
        await connection.manager.save(comment1);

        const comment2 = new Comment();
        comment2.userId = user2.id;
        comment2.comment = "This is incredible!";
        comment2.postId = post.id;
        await connection.manager.save(comment2);

        if (connection.driver.options.type === "mysql") {
            const post = await connection.manager.createQueryBuilder(Post, "post")
                .innerJoin("post.user", "user")
                .innerJoin("post.comments", "comments")
                .select(["post.id", "post.title", "user.id", "user.name", "user.surname", "comments.id", "comments.comment"]) // We need select the id of each entity for a correct mapping. This is required
                .addSelectAndMap("IF(LENGTH(post.title > 0), true, false)", "post.hasTitle", "hasTitle", "boolean")
                .addSelectAndMap(`CONCAT(user.name, " ", user.surname)`, "user.fullName", "fullName")
                .addSelectAndMap("IF(comments.userId = user.id, true, false)", "comments.opComment", "opComment", "boolean")
                .getOne();

            expect(post).not.to.be.undefined;
            expect(post!.hasTitle).not.to.be.undefined;
            expect(post!.user!.fullName).not.to.be.undefined;
            expect(post!.comments.length).to.be.equal(2);
            post!.comments.forEach(comment => {
                expect(comment.opComment).not.to.be.undefined;
            });
        }
    })));
});
