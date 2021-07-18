import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Post} from "./entity/Post";
import {expect} from "chai";


describe("github issues > #296 select additional computed columns", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should correctly select computed columns and populate given entity properties", () => Promise.all(connections.map(async connection => {

        const post = new Post();
        post.title = "hello post";
        post.text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiu";
        await connection.manager.save(post);

        const lengthOperator = connection.driver.options.type === "mssql" ? "LEN" : "LENGTH";
        const subStrOperation = ["sqljs", "sqlite"].indexOf(connection.driver.options.type) > -1 ? "SUBSTR" : "SUBSTRING";

        const query = connection.manager.createQueryBuilder(Post, "post");
        const loadedPost = await query
            .select("post.id")
            .addSelect(`${subStrOperation}(post.text, 1, 20)`, "post_text")
            .addSelect(`${lengthOperator}(post.text)`, `${query.alias}_textSize`)
            .getOne();

        expect(loadedPost).not.to.be.undefined;
        expect(loadedPost!.text).not.to.be.undefined;
        expect(loadedPost!.text!.length).to.be.equal(20);
        // Some drivers return function int's as strings's, so just to be sure
        // we cast both to string
        expect("" + loadedPost!.textSize).to.be.equal("" + post.text.length);
    })));
});
