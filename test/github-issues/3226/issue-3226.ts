import "reflect-metadata";

import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases
} from "../../utils/test-utils";
import { Connection } from "../../../src";
import { User } from "./entity/User";
import { Post } from "./entity/Post";
import { expect } from "chai";

describe("github issues > #3226 Typeorm wrong generate field name for relations field in embedded entity", () => {
    let connections: Connection[];
    before(
        async () =>
            (connections = await createTestingConnections({
                entities: [User, Post],
                dropSchema: true,
            }))
    );
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should Post.authorId be empty and Post.info.authorId have user id", () =>
        Promise.all(
            connections.map(async connection => {
                try {
                    const userRepo = connection.getRepository(User);
                    const postRepo = connection.getRepository(Post);
                    const user = new User();
                    user.name = "User Test";

                    const savedUser = await userRepo.save(user);

                    const post = new Post();
                    post.name = "Test post";
                    post.info.author = savedUser;

                    const savedPost = await postRepo.save(post);

                    expect(savedPost.authorId).to.be.empty;
                    expect(savedPost.info.authorId).not.to.be.empty;
                } catch (err) {
                    throw err;
                }
            })
        ));
});
