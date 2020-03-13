import "reflect-metadata";
import {Connection} from "../../../../src";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Post} from "./entity/Post";
import {expect} from "chai";

describe("observers > one > on remove", function() {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should dispatch event with new value when entity is removed", ok => {
        if (!connections.length) ok();
        connections.filter((connection, index) => index === 0).map(async connection => {

            let time: number = 0;
            /*const post1 = */await connection.manager.save(new Post("Hello #1"));
            const post2 = await connection.manager.save(new Post("Hello #2"));
            /*const post3 = */await connection.manager.save(new Post("Hello #3"));
            /*const post4 =*/await connection.manager.save(new Post("Hello #4"));

            connection.manager.observeOne(Post, { where: { id: 2 } }).subscribe(entity => {
                time++;

                if (time === 1) {
                    entity.should.be.eql({ id: 2, title: "Hello #2", active: true });
                    connection.manager.remove(post2);

                } else if (time === 2) {
                    expect(entity).to.be.undefined;
                    ok();
                }
            });
        });
    });

    it("should dispatch event with new value when entity is via delete query", ok => {
        if (!connections.length) ok();
        connections.filter((connection, index) => index === 0).map(async connection => {

            let time: number = 0;
            /*const post1 = */await connection.manager.save(new Post("Hello #1"));
            /*const post2 = */await connection.manager.save(new Post("Hello #2"));
            /*const post3 = */await connection.manager.save(new Post("Hello #3"));
            /*const post4 =*/await connection.manager.save(new Post("Hello #4"));

            connection.manager.observeOne(Post, { where: { id: 2 } }).subscribe(entity => {
                time++;

                if (time === 1) {
                    entity.should.be.eql({ id: 2, title: "Hello #2", active: true });
                    connection.manager.delete(Post, { title: "Hello #2" });

                } else if (time === 2) {
                    expect(entity).to.be.undefined;
                    ok();
                }
            });
        });
    });

    it("should observe query even if entity was removed and new added", ok => {
        if (!connections.length) ok();
        connections.filter((connection, index) => index === 0).map(async connection => {
            let time: number = 0;

            const post = new Post("Hello Post");
            await connection.manager.save(post);
            connection.manager.observeOne(Post, { title: "Hello Post" }).subscribe(entity => {
                time++;

                if (time === 1) {
                    entity.should.be.eql({ id: 1, title: "Hello Post", active: true });
                    connection.manager.remove(post);
                } else if (time === 2) {
                    expect(entity).to.be.undefined;
                    connection.manager.save(post);
                } else if (time === 3) {
                    entity.should.be.eql({ id: 2, title: "Hello Post", active: true });
                    ok();
                }
            });
        });
    });


});
