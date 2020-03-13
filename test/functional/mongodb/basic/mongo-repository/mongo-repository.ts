import "reflect-metadata";
import {Connection} from "../../../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {Post} from "./entity/Post";

describe("mongodb > MongoRepository", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [Post],
        enabledDrivers: ["mongodb"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("connection should return mongo repository when requested", () => Promise.all(connections.map(async connection => {
        // todo
        // const postRepository = connection.getMongoRepository(Post);
        // postRepository.should.be.instanceOf(MongoRepository);
    })));

    it("entity manager should return mongo repository when requested", () => Promise.all(connections.map(async connection => {
        // todo
        // const postRepository = connection.manager.getMongoRepository(Post);
        // postRepository.should.be.instanceOf(MongoRepository);
    })));

    it("should be able to use entity cursor which will return instances of entity classes", () => Promise.all(connections.map(async connection => {
        const postRepository = connection.getMongoRepository(Post);

        // save few posts
        const firstPost = new Post();
        firstPost.title = "Post #1";
        firstPost.text = "Everything about post #1";
        await postRepository.save(firstPost);

        const secondPost = new Post();
        secondPost.title = "Post #2";
        secondPost.text = "Everything about post #2";
        await postRepository.save(secondPost);

        const cursor = postRepository.createEntityCursor({
            title: "Post #1"
        });

        const loadedPosts = await cursor.toArray();
        loadedPosts.length.should.be.equal(1);
        loadedPosts[0].should.be.instanceOf(Post);
        loadedPosts[0].id.should.be.eql(firstPost.id);
        loadedPosts[0].title.should.be.equal("Post #1");
        loadedPosts[0].text.should.be.equal("Everything about post #1");

    })));

    it("should be able to use entity cursor which will return instances of entity classes", () => Promise.all(connections.map(async connection => {
        const postRepository = connection.getMongoRepository(Post);

        // save few posts
        const firstPost = new Post();
        firstPost.title = "Post #1";
        firstPost.text = "Everything about post #1";
        await postRepository.save(firstPost);

        const secondPost = new Post();
        secondPost.title = "Post #2";
        secondPost.text = "Everything about post #2";
        await postRepository.save(secondPost);

        const loadedPosts = await postRepository.createEntityCursor({
            $or: [
                { title: "Post #1", },
                { text: "Everything about post #1" }
            ]
        }).toArray();

        loadedPosts.length.should.be.equal(1);
        loadedPosts[0].should.be.instanceOf(Post);
        loadedPosts[0].id.should.be.eql(firstPost.id);
        loadedPosts[0].title.should.be.equal("Post #1");
        loadedPosts[0].text.should.be.equal("Everything about post #1");

    })));

    // todo: cover other methods as well

});
