import { expect } from "chai";
import "reflect-metadata";
import { Connection } from "@typeorm/core";
import {
    closeTestingConnections,
    createTestingConnections,
    reloadTestingDatabases,
    sleep
} from "../../../utils/test-utils";
import { Post } from "./entity/Post";

describe("column kinds > update date column", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("update date column should automatically be set by a database", () => Promise.all(connections.map(async connection => {
        const postRepository = connection.getRepository(Post);

        // save a new post
        const post = new Post();
        post.title = "Post";
        await postRepository.save(post);

        // load and check if updatedAt is a date (generated by db)
        const loadedPost = await postRepository.findOne();
        expect(loadedPost).to.be.not.empty;
        expect(loadedPost!.title).to.be.eql("Post");
        expect(loadedPost!.updatedAt).to.be.instanceOf(Date);
    })));

    it("update column should not update if no changes were detected", () => Promise.all(connections.map(async connection => {
        const postRepository = connection.getRepository(Post);

        // save a new post
        const post = new Post();
        post.title = "Post";
        await postRepository.save(post);

        // update post once again
        const loadedPost1 = await postRepository.findOneOrFail();
        await postRepository.save(loadedPost1);

        // load and check if version was a value set by us
        const loadedPost2 = await postRepository.findOne();

        // make sure version is the same
        expect(loadedPost2!.title).to.be.eql("Post");
        expect(loadedPost2!.updatedAt).to.be.eql(loadedPost1.updatedAt);
    })));

    it("update date column can also be manually set by user", () => Promise.all(connections.map(async connection => {
        const postRepository = connection.getRepository(Post);

        const updatedAt = new Date(Date.parse("2020-01-01T00:00:00+0000"));

        // save a new post
        const post = new Post();
        post.title = "Post";
        post.updatedAt = updatedAt;
        await postRepository.save(post);

        // load and check if updatedAt was a value set by us
        const loadedPost = await postRepository.findOne();
        expect(loadedPost).to.be.not.empty;
        expect(loadedPost!.title).to.be.eql("Post");
        expect(loadedPost!.updatedAt).to.be.eql(updatedAt);
    })));

    it("update date column should be updated automatically on every change", () => Promise.all(connections.map(async connection => {
        const postRepository = connection.getRepository(Post);

        // save a new post
        const post = new Post();
        post.title = "Post";
        await postRepository.save(post);

        // load to get updated date we had after first save
        const loadedPostBeforeUpdate = await postRepository.findOne();

        // wait a second
        await sleep(1000);

        // update post once again
        post.title = "Updated Title";
        await postRepository.save(post);

        // check if date was updated
        const loadedPostAfterUpdate = await postRepository.findOne();
        expect(loadedPostAfterUpdate!.updatedAt.toString()).to.be.not.eql(loadedPostBeforeUpdate!.updatedAt.toString());
    })));

    it("update date column should set a custom date when specified", () => Promise.all(connections.map(async connection => {
        const postRepository = connection.getRepository(Post);

        // save a new post
        const post = new Post();
        post.title = "Post";
        await postRepository.save(post);

        // update post once again
        const updatedAt = new Date(Date.parse("2020-01-01T00:00:00+0000"));
        post.title = "Updated Title";
        post.updatedAt = updatedAt;
        await postRepository.save(post);

        // check if date was updated
        const loadedPost = await postRepository.findOne();
        expect(loadedPost!.updatedAt).to.be.eql(updatedAt);
    })));
});
