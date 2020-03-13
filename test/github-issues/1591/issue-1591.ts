import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {User} from "./entity/User";
import {Photo} from "./entity/Photo";

describe("github issues > #1591 Define order of relation data when querying on the main entity", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["mysql"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should query correct number of users with joined data ordering applied", () => Promise.all(connections.map(async connection => {
        for (let i = 0; i < 30; i++) {
            const photo1 = new Photo();
            photo1.name = "Photo #" + i + "_1";
            photo1.date = new Date(2018, 0, i);
            await connection.manager.save(photo1);

            const photo2 = new Photo();
            photo2.name = "Photo #" + i + "_1";
            photo2.date = new Date(2016, 0, i);
            await connection.manager.save(photo2);

            const user = new User();
            user.name = "User #" + i;
            user.photos = [photo1, photo2];
            await connection.manager.save(user);
        }

        await connection
            .createQueryBuilder(User, "user")
            .leftJoinAndSelect("user.photos", "photo")
            .orderBy("user.name")
            .addOrderBy("photo.date")
            .skip(0)
            .take(5)
            .getMany();
    })));

});
