import "reflect-metadata";
import {Connection, LessThan} from "../../../../src";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Post} from "./entity/Post";

describe("observers > many and count > on remove", function() {

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

            let time: number = 0, lastEntities: Post[];
            /*const post1 = */await connection.manager.save(new Post("Hello #1"));
            const post2 = await connection.manager.save(new Post("Hello #2"));
            /*const post3 = */await connection.manager.save(new Post("Hello #3"));
            const post4 = await connection.manager.save(new Post("Hello #4"));

            connection.manager.observeManyAndCount(Post, { where: { id: LessThan(4) } }).subscribe(([entities, count]) => {
                lastEntities = entities;
                time++;

                if (time === 1) {
                    entities.should.be.eql([
                        { id: 1, title: "Hello #1", active: true },
                        { id: 2, title: "Hello #2", active: true },
                        { id: 3, title: "Hello #3", active: true },
                    ]);
                    count.should.be.equal(3);
                    connection.manager.remove(post2);

                } else if (time === 2) {
                    entities.should.be.eql([
                        { id: 1, title: "Hello #1", active: true },
                        { id: 3, title: "Hello #3", active: true },
                    ]);
                    count.should.be.equal(2);
                    connection.manager.delete(Post, {
                        title: "Hello #1"
                    });

                } else if (time === 3) {
                    entities.should.be.eql([
                        { id: 3, title: "Hello #3", active: true },
                    ]);
                    count.should.be.equal(1);
                    Promise.all([
                        connection.manager.save(new Post("Hello #5")),
                        connection.manager.remove(post4),
                    ]).then(() => {
                        time.should.be.equal(3);
                        lastEntities.should.be.eql([
                            { id: 3, title: "Hello #3", active: true },
                        ]);
                        setTimeout(ok, 50);
                    });
                }
            });
        });
    });

});
