import "reflect-metadata";
import { closeTestingConnections, createTestingConnections, reloadTestingDatabases } from "../../utils/test-utils";
import { Connection } from "../../../src/connection/Connection";
import { expect } from "chai";
import { User } from "./entity/user.entity";
import { Photo } from "./entity/photo.entity";

describe("github issues > #3288 null foreign key when inserting with number instead of relation object", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should assign foreign field key to relation id", () => Promise.all(connections.map(async connection => {
        const user = new User();
        
        const dbUser = await connection.manager.save(user);

        const photo = new Photo();
        photo.user = dbUser.id as any;

        await connection.manager.save(photo);

        const loadedPhoto = await connection
            .manager.findOne(Photo, 1);

        expect(loadedPhoto).not.to.be.empty;
        expect(loadedPhoto!.userId).not.to.be.null;
    })));

});
