import "reflect-metadata";
import {Between} from "../../../../src";
import {Connection} from "../../../../src";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Post} from "./entity/Post";

describe("observers > count > on insert", function() {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
        });
    });
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should observe entities when new entity is inserted", ok => {
        if (!connections.length) ok();
        connections.filter((connection, index) => index === 0).map(async connection => {
            let time: number = 0;

            await connection.manager.save(new Post("Hello Post"));
            const subscription = connection.manager.observeCount(Post).subscribe(count => {
                time++;

                if (time === 1) {
                    count.should.be.equal(1);
                    connection.manager.save(new Post("Second Post"));

                } else if (time === 2) {
                    count.should.be.equal(2);
                    connection.manager.save(new Post("Third Post"));

                } else if (time === 3) {
                    count.should.be.equal(3);
                    subscription.unsubscribe();

                    connection.manager
                        .save(new Post("Forth Post"))
                        .then(() => {
                            setTimeout(() => {
                                time.should.be.equal(3);
                                ok();
                            }, 50);
                        });
                }
            });
        });
    });

    it("should observe entities when new entity is inserted with conditional query", ok => {
        if (!connections.length) ok();
        connections.filter((connection, index) => index === 0).map(async connection => {
            let time: number = 0, lastCount = 0;

            await connection.manager.save(new Post("Hello #1"));
            await connection.manager.save(new Post("Hello #2"));
            await connection.manager.save(new Post("Hello #3"));

            connection.manager
                .observeCount(Post, {
                    id: Between(3, 5)
                }).subscribe(count => {
                    lastCount = count;
                    time++;

                    if (time === 1) {
                        count.should.be.equal(1);
                        connection.manager.save(new Post("Hello #4"));

                    } else if (time === 2) {
                        count.should.be.equal(2);
                        connection.manager.save(new Post("Hello #5"));

                    } else if (time === 3) {
                        count.should.be.equal(3);
                        connection.manager
                            .save(new Post("Hello #6"))
                            .then(() => {
                                time.should.be.equal(3);
                                lastCount.should.be.equal(3);
                                setTimeout(ok, 50);
                            });
                    }
                });
        });
    });

});
