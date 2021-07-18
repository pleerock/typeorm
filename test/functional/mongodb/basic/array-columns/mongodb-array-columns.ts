import "reflect-metadata";
import {Connection} from "../../../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../../utils/test-utils";
import {Post} from "./entity/Post";
import {Counters} from "./entity/Counters";
import {expect} from "chai";

describe("mongodb > array columns", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [Post, Counters],
        enabledDrivers: ["mongodb"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should insert / update array columns correctly", () => Promise.all(connections.map(async connection => {
        const postRepository = connection.getRepository(Post);

        // save a post
        const post = new Post();
        post.title = "Post";
        post.names = ["umed", "dima", "bakhrom"];
        post.numbers = [1, 0, 1];
        post.booleans = [true, false, false];
        post.counters = [
            new Counters(1, "number #1"),
            new Counters(2, "number #2"),
            new Counters(3, "number #3"),
        ];
        post.other1 = [];
        await postRepository.save(post);

        // check saved post
        const loadedPost = await postRepository.findOne({ title: "Post" });

        expect(loadedPost).to.be.not.empty;
        expect(loadedPost!.names).to.be.not.empty;
        expect(loadedPost!.numbers).to.be.not.empty;
        expect(loadedPost!.booleans).to.be.not.empty;
        expect(loadedPost!.counters).to.be.not.empty;
        expect(loadedPost!.other1).to.have.length(0);
        expect(loadedPost!.other2).to.be.undefined;

        expect(loadedPost!.names[0]).to.eql("umed");
        expect(loadedPost!.names[1]).to.eql("dima");
        expect(loadedPost!.names[2]).to.eql("bakhrom");

        expect(loadedPost!.numbers[0]).to.eql(1);
        expect(loadedPost!.numbers[1]).to.eql(0);
        expect(loadedPost!.numbers[2]).to.eql(1);

        expect(loadedPost!.booleans[0]).to.eql(true);
        expect(loadedPost!.booleans[1]).to.eql(false);
        expect(loadedPost!.booleans[2]).to.eql(false);

        expect(loadedPost!.counters[0]).to.be.instanceOf(Counters);
        expect(loadedPost!.counters[1]).to.be.instanceOf(Counters);
        expect(loadedPost!.counters[2]).to.be.instanceOf(Counters);

        expect(loadedPost!.counters[0].likes).to.be.eql(1);
        expect(loadedPost!.counters[1].likes).to.be.eql(2);
        expect(loadedPost!.counters[2].likes).to.be.eql(3);

        expect(loadedPost!.counters[0].text).to.be.eql("number #1");
        expect(loadedPost!.counters[1].text).to.be.eql("number #2");
        expect(loadedPost!.counters[2].text).to.be.eql("number #3");

        // now update the post
        post.names = ["umed!", "dima!", "bakhrom!"];
        post.numbers = [11, 10, 11];
        post.booleans = [true, true, true];
        post.counters = [
            new Counters(11, "number #11"),
            new Counters(12, "number #12"),
        ];
        post.other1 = [
            new Counters(0, "other"),
        ];
        await postRepository.save(post);

        // now load updated post
        const loadedUpdatedPost = await postRepository.findOne({ title: "Post" });

        expect(loadedUpdatedPost).to.be.not.empty;
        expect(loadedUpdatedPost!.names).to.be.not.empty;
        expect(loadedUpdatedPost!.numbers).to.be.not.empty;
        expect(loadedUpdatedPost!.booleans).to.be.not.empty;
        expect(loadedUpdatedPost!.counters).to.be.not.empty;
        expect(loadedUpdatedPost!.other1).to.be.not.empty;
        expect(loadedUpdatedPost!.other2).to.be.undefined;

        expect(loadedUpdatedPost!.names[0]).to.eql("umed!");
        expect(loadedUpdatedPost!.names[1]).to.eql("dima!");
        expect(loadedUpdatedPost!.names[2]).to.eql("bakhrom!");

        expect(loadedUpdatedPost!.numbers[0]).to.eql(11);
        expect(loadedUpdatedPost!.numbers[1]).to.eql(10);
        expect(loadedUpdatedPost!.numbers[2]).to.eql(11);

        expect(loadedUpdatedPost!.booleans[0]).to.eql(true);
        expect(loadedUpdatedPost!.booleans[1]).to.eql(true);
        expect(loadedUpdatedPost!.booleans[2]).to.eql(true);

        expect(loadedUpdatedPost!.counters[0]).to.be.instanceOf(Counters);
        expect(loadedUpdatedPost!.counters[1]).to.be.instanceOf(Counters);


        expect(loadedUpdatedPost!.counters[0].likes).to.be.eql(11);
        expect(loadedUpdatedPost!.counters[1].likes).to.be.eql(12);

        expect(loadedUpdatedPost!.counters[0].text).to.be.eql("number #11");
        expect(loadedUpdatedPost!.counters[1].text).to.be.eql("number #12");

        expect(loadedUpdatedPost!.other1[0]).to.be.instanceOf(Counters);
        expect(loadedUpdatedPost!.other1[0].likes).to.eql(0);
        expect(loadedUpdatedPost!.other1[0].text).to.eql("other");
    })));

    it("should retrieve arrays from the column metadata", () => Promise.all(connections.map(async connection => {
        const post = new Post();
        post.title = "Post";
        post.names = ["umed", "dima", "bakhrom"];
        post.numbers = [1, 0, 1];
        post.booleans = [true, false, false];
        post.counters = [
            new Counters(1, "number #1"),
            new Counters(2, "number #2"),
            new Counters(3, "number #3"),
        ];
        post.other1 = [];

        const column = connection.getMetadata(Post)
            .columns
            .find(c => c.propertyPath === 'counters.text')!;

        const value = column.getEntityValue(post);

        expect(value).to.eql([ "number #1", "number #2", "number #3" ]);
    })));
});
