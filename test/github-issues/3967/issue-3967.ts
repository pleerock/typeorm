import "reflect-metadata";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {expect} from "chai";
import {User} from "./entity/User";
import {Post} from "./entity/Post";

describe("github issues > #3967 main entity ordering with join, skip and take", () => {
    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        schemaCreate: true,
        dropSchema: true,
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should be ordered even when used with join, skip and take", () => Promise.all(connections.map(async connection => {
        // Given
        for (let i = 0; i < 10; i++) {
          const user = new User();
          user.name = `User${i}`;
          await connection.manager.save(user);

          const post1 = new Post();
          post1.content = "Post1";
          post1.order = 1;
          post1.user = user;
          await connection.manager.save(post1);

          const post2 = new Post();
          post2.content = "Post2";
          post2.order = 2;
          post2.user = user;
          await connection.manager.save(post2);
        }

        // When
        const users = await connection.createQueryBuilder(User, "u")
          .innerJoinAndSelect("u.posts", "p")
          .orderBy({
            "u.id": "DESC",
            "p.order": "DESC"
          })
          .skip(0)
          .take(5)
          .getMany();

        // Then
        expect(users).to.be.length(5);
    })));

    // you can add additional tests if needed

});

