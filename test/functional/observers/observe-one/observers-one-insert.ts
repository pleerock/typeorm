import "reflect-metadata";
import {Connection} from "../../../../src";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Post} from "./entity/Post";

describe("observers > one > on insert", function() {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should dispatch event properly", ok => {
        if (!connections.length) ok();
        connections.filter((connection, index) => index === 0).map(async connection => {
            let time: number = 0;

            await connection.manager.save(new Post("Hello Post"));
            connection.manager.observeOne(Post, { id: 1 }).subscribe(entity => {
                time++;

                if (time === 1) {
                    entity.should.be.eql({ id: 1, title: "Hello Post", active: true });
                    connection.manager
                        .save(new Post("Second Post"))
                        .then(() => {
                            time.should.be.equal(1);
                            entity.should.be.eql({ id: 1, title: "Hello Post", active: true });
                            setTimeout(ok, 50);
                        });
                }
            });
        });
    });

});
