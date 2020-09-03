import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import User from "./entity/User";
import Post from "./entity/Post";
import Category from "./entity/Category";
import {expect} from "chai";
import { EntityManager } from "../../../src";
import { PostgresDriver } from "../../../src/driver/postgres/PostgresDriver";

async function createTrigger(em: EntityManager) {
    await em.query(
        `
        CREATE OR REPLACE FUNCTION post_code()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN
            NEW.code = md5(random()::text);
            RETURN NEW;
        END $$;
        `
    );
    await em.query(
        `
        CREATE TRIGGER trig_post
        BEFORE INSERT ON post
        FOR EACH ROW
        EXECUTE PROCEDURE post_code();
        `
    );
}

describe("github issues > #3490 Method save does not return the entire model", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("Should refresh columns after save", () => Promise.all(connections.map(
        async function(connection) {

            const user = new User();
            user.name = "Carl";
            user.dateBorn = new Date();

            await connection.getRepository(User).save(user);

            expect(user.id).to.exist;

            const category = new Category();
            category.name = "Tech";

            await connection.getRepository(Category).save(category);

            expect(category.id).to.exist;

            const post = new Post();
            post.subject = "New smartphone";
            post.body = "Very fast";
            post.code = "ABC";
            post.authorId = user.id;
            post.categoryId = category.id;

            await connection.getRepository(Post).save(post);

            expect(post.createdAt).to.exist;
            expect(post.updatedAt).to.exist;
            expect(post.code).to.eq("ABC");

            expect(user.posts).to.not.exist;
            expect(category.posts).to.not.exist;
    })));

    it("Should not refresh columns after saving if reload is set to false", () => Promise.all(connections.map(
        async function(connection) {

            const user = new User();
            user.name = "Carl";
            user.dateBorn = new Date();

            await connection.getRepository(User).save(user, {reload: false});

            expect(user.id).to.not.exist;

            const category = new Category();
            category.name = "Finances";

            await connection.getRepository(Category).save(category, {reload: false});

            expect(category.id).to.not.exist;

            const author = await connection.getRepository(User).findOne();
            const categoryDb = await connection.getRepository(Category).findOne();

            const post = new Post();
            post.authorId = author!.id;
            post.body = "Test post";
            post.subject = "Test";
            post.code = "ABC";
            post.category = categoryDb!;

            await connection.getRepository(Post).save(post, {reload: false});

            expect(post.authorId).to.be.a("number");
            expect(post.authorId).to.equal(author?.id);
            expect(post.category).to.be.instanceOf(Category);
            expect(post.category.name).to.equal(category.name);
            expect(post.code).to.eq("ABC");
            expect(post.createdAt).to.not.exist;
            expect(post.updatedAt).to.not.exist;

            post.body = "New Test";

            await connection.getRepository(Post).save(post, {reload: false});
            expect(post).to.deep.eq({
                authorId: author?.id,
                body: "New Test",
                subject: "Test",
                code: "ABC",
                category: {
                    id: categoryDb?.id,
                    name: "Finances"
                },
                categoryId: categoryDb?.id
            });

            category.name = "New Finances";
            await connection.getRepository(Category).save(category);

            expect(category.name).to.equal("New Finances");
            expect(post.category.name).to.equal("Finances");

    })));
    it("Should retrieve inserted data changed by a trigger", () => Promise.all(connections.map(
        async function(connection) {
            if (connection.driver instanceof PostgresDriver) {
                await createTrigger(connection.manager);

                const user = new User();
                user.name = "Carl";
                user.dateBorn = new Date();

                await connection.getRepository(User).save(user);

                const category = new Category();
                category.name = "Finances";

                await connection.getRepository(Category).save(category);

                const post = new Post();
                post.author = user;
                post.category = category;
                post.body = "Trigger";
                post.subject = "Trigger";

                await connection.getRepository(Post).save(post);

                expect(post.code).to.match(/^[a-f0-9]{32}$/);
            }
    })));
});
