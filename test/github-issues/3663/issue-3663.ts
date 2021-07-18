import "reflect-metadata";
import { Connection } from "../../../src";
import {
    closeTestingConnections,
    createTestingConnections
} from "../../utils/test-utils";
import { Post } from "./entity/Post";
import { PromiseUtils } from "../../../src";

describe("github issues > #3663 Eager loading recursive relation causes infinite loop", () => {
    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["postgres"],
            dropSchema: true
        });
    });
    after(() => closeTestingConnections(connections));

    it("the post should be loaded correctly", () =>
        PromiseUtils.runInSequence(connections, async connection => {
            await connection.synchronize();

            const repository = connection.getRepository(Post);

            const post = new Post();

            await repository.save(post);

            await repository.findOne(post.id);
        }));
});
