import "reflect-metadata";
import {Connection, LessThan} from "../../../../src";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Post} from "./entity/Post";

describe("observers > count > on update", function() {

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
            /*const post1 = */await connection.manager.save(new Post("Hello #1"));
            const post2 = await connection.manager.save(new Post("Hello #2"));
            /*const post3 = */await connection.manager.save(new Post("Hello #3"));
            /*const post4 = */await connection.manager.save(new Post("Hello #4"));

            connection.manager.observeCount(Post, { id: LessThan(4), active: true }).subscribe(count => {
                time++;

                if (time === 1) {
                    count.should.be.equal(3);
                    post2.active = false;
                    connection.manager.save(post2);

                } else if (time === 2) {
                    count.should.be.equal(2);
                    ok();
                }
            });
        });
    });

});
