import { Connection } from "../../../src";
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases
} from "../../utils/test-utils";
import { User } from "./entity/User";

// todo: doesn't work since 0.3.x, fix it later
describe.skip("github issues > #3654 Should be able compare buffer type", () => {
    let connections: Connection[];
    before(
        async () =>
            (connections = await createTestingConnections({
                entities: [__dirname + "/entity/*{.js,.ts}"],
                enabledDrivers: ["mysql"]
            }))
    );
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("Repository.save() method should be able compare buffer type for deciding if save or update ops.", () =>
        Promise.all(
            connections.map(async connection => {
                const userRepo = connection.getRepository(User);

                let userId = "4321226123455910A532153E57A78445".toLowerCase();

                const user = new User();
                user.id = userId;
                user.age = 25;
                await userRepo.save(user);

                const dbUser = (await userRepo.find({
                    where: {
                        id: userId
                    }
                }))[0];

                dbUser.age = 26;
                await userRepo.save(dbUser);

                const confirmUser = (await userRepo.find({
                    where: {
                        id: userId
                    }
                }))[0];

                confirmUser.id.should.be.eql(userId);
                confirmUser.age.should.be.eql(26);
            })
        ));
});
