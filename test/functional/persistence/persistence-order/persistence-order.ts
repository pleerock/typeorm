import { expect } from "chai";
import "reflect-metadata";
import { Connection } from "../../../../src/connection/Connection";
import { closeTestingConnections, createTestingConnections, reloadTestingDatabases } from "../../../utils/test-utils";
import { Category } from "./entity/Category";
import { Post } from "./entity/Post";

describe("persistence > order of persistence execution operations", () => {

    describe("should throw exception when non-resolvable circular relations found", function() {

        it("should throw CircularRelationsError", () => {
            expect(() => {
                new Connection({ // dummy connection options, connection won't be established anyway
                    type: "mysql",
                    host: "localhost",
                    username: "test",
                    password: "test",
                    database: "test",
                    entities: [__dirname + "/entity/*{.js,.ts}"]
                });
            }).to.throw(Error);
        });


    });

    describe.skip("should persist all entities in correct order", function() {

        let connections: Connection[];
        before(async () => connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
        }));
        beforeEach(() => reloadTestingDatabases(connections));
        after(() => closeTestingConnections(connections));
        it("", () => Promise.all(connections.map(async connection => {

            // create first category and post and save them
            const category1 = new Category();
            category1.name = "Category saved by cascades #1";

            const post1 = new Post();
            post1.title = "Hello Post #1";
            post1.category = category1;

            await connection.manager.save(post1);

            // now check
            /*const posts = await connection.manager.find(Post, {
             alias: "post",
             innerJoinAndSelect: {
             category: "post.category"
             },
             orderBy: {
             "post.id": "ASC"
             }
             });

             posts.should.be.eql([{
             id: 1,
             title: "Hello Post #1",
             category: {
             id: 1,
             name: "Category saved by cascades #1"
             }
             }, {
             id: 2,
             title: "Hello Post #2",
             category: {
             id: 2,
             name: "Category saved by cascades #2"
             }
             }]);*/
        })));
    });



});
