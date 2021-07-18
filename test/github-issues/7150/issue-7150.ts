import "reflect-metadata";
import {Connection} from "../../../src";
import {createTestingConnections, closeTestingConnections} from "../../utils/test-utils";
import {Post} from "./entity/Post";

describe("github issues > #7150 Transformers break CreatedDate / UpdatedDate columns", () => {
    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        enabledDrivers: ["postgres"],
        schemaCreate: true,
        dropSchema: true,
        entities: [Post],
    }));
    after(() => closeTestingConnections(connections));

    it("updates updatedAt when changes occur", () => Promise.all(connections.map(async connection => {
        const repo = connection.getRepository(Post);
        const post = repo.create({ content: "hello!" });
        const savedPost = await repo.save(post);
        savedPost.createdAt!.should.be.a("number");
        savedPost.updatedAt!.should.be.a("number");
        savedPost.updatedAt!.should.be.equal(savedPost.createdAt!);

        const update = repo.merge(savedPost, { content: "hello world!" });
        const updatedPost = await repo.save(update);
        updatedPost.createdAt!.should.be.a("number");
        updatedPost.updatedAt!.should.be.a("number");
        updatedPost.createdAt!.should.be.equal(savedPost.createdAt!);
        updatedPost.updatedAt!.should.be.greaterThan(savedPost.createdAt!);
    })));

    it("leaves updatedAt column alone when no changes occur", () => Promise.all(connections.map(async connection => {
        const repo = connection.getRepository(Post);
        const post = repo.create({ content: "hello!" });
        await repo.save(post);
        const savedPost = await repo.save(post);
        savedPost.createdAt!.should.be.a("number");
        savedPost.updatedAt!.should.be.a("number");
        savedPost.updatedAt!.should.be.equal(savedPost.createdAt!);
    })));
});
