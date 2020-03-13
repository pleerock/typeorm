import "reflect-metadata";
import {Connection, LessThan, MoreThan} from "../../../../src";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Post} from "./entity/Post";

describe("observers > many and count > on update", function() {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should dispatch event with new value when entity is updated", ok => {
        if (!connections.length) ok();
        connections.filter((connection, index) => index === 0).map(async connection => {
            let time: number = 0;
            const post1 = await connection.manager.save(new Post("Hello #1"));
            const post2 = await connection.manager.save(new Post("Hello #2"));
            /*const post3 = */await connection.manager.save(new Post("Hello #3"));
            /*const post4 = */await connection.manager.save(new Post("Hello #4"));

            connection.manager.observeManyAndCount(Post, { where: { id: LessThan(4), active: true } }).subscribe(([entities, count]) => {
                time++;

                if (time === 1) {
                    entities.should.be.eql([
                        { id: 1, title: "Hello #1", active: true },
                        { id: 2, title: "Hello #2", active: true },
                        { id: 3, title: "Hello #3", active: true },
                    ]);
                    count.should.be.equal(3);
                    post1.title = "Updated Post #1";
                    connection.manager.save(post1);

                } else if (time === 2) {
                    entities.should.be.eql([
                        { id: 1, title: "Updated Post #1", active: true },
                        { id: 2, title: "Hello #2", active: true },
                        { id: 3, title: "Hello #3", active: true },
                    ]);
                    count.should.be.equal(3);
                    connection.manager.save(new Post("Hello #5"));
                    setTimeout(() => {
                        post1.title = "Again Updated Post #1";
                        connection.manager.save(post1);
                    }, 50);

                } else if (time === 3) {
                    entities.should.be.eql([
                        { id: 1, title: "Again Updated Post #1", active: true },
                        { id: 2, title: "Hello #2", active: true },
                        { id: 3, title: "Hello #3", active: true },
                    ]);
                    count.should.be.equal(3);

                    post2.title = "Updated Post #2";
                    connection.manager.save(post2);

                } else if (time === 4) {
                    entities.should.be.eql([
                        { id: 1, title: "Again Updated Post #1", active: true },
                        { id: 2, title: "Updated Post #2", active: true },
                        { id: 3, title: "Hello #3", active: true },
                    ]);
                    count.should.be.equal(3);

                    connection.manager.update(Post, {
                        id: MoreThan(1)
                    }, {
                        title: "raw updated"
                    });

                } else if (time === 5) {
                    entities.should.be.eql([
                        { id: 1, title: "Again Updated Post #1", active: true },
                        { id: 2, title: "raw updated", active: true },
                        { id: 3, title: "raw updated", active: true },
                    ]);
                    count.should.be.equal(3);

                    post2.active = false;
                    connection.manager.save(post2);

                } else if (time === 6) {
                    entities.should.be.eql([
                        { id: 1, title: "Again Updated Post #1", active: true },
                        { id: 3, title: "raw updated", active: true },
                    ]);
                    count.should.be.equal(2);
                    ok();
                }
            });
        });
    });

});
