import {expect} from "chai";
import "reflect-metadata";
import {Connection} from "../../../../src";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../utils/test-utils";
import {Post} from "./entity/Post";

describe("observers > one > on update", function() {

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
            /*const post2 = */await connection.manager.save(new Post("Hello #2"));
            const post3 = await connection.manager.save(new Post("Hello #3"));
            /*const post4 = */await connection.manager.save(new Post("Hello #4"));

            connection.manager.observeOne(Post, { where: { id: 3, active: true } }).subscribe(entity => {
                time++;

                if (time === 1) {
                    entity.should.be.eql({ id: 3, title: "Hello #3", active: true });
                    post3.title = "Updated Post #3";
                    connection.manager.save(post3);

                } else if (time === 2) {
                    entity.should.be.eql({ id: 3, title: "Updated Post #3", active: true });
                    post3.active = false;
                    connection.manager.save(post3);

                } else if (time === 3) {
                    expect(entity).to.be.undefined;
                    connection.manager.update(Post, { id: 3, active: false }, { active: true });

                } else if (time === 4) {
                    entity.should.be.eql({ id: 3, title: "Updated Post #3", active: true });
                    ok();
                }
            });
        });
    });

});
