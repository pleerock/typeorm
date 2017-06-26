import "reflect-metadata";
import {createTestingConnections, closeTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {MigrationExecutor} from "../../../src/migration/MigrationExecutor";
import {QueryRunnerProvider} from "../../../src/query-runner/QueryRunnerProvider";
import {ObjectLiteral} from "../../../src/common/ObjectLiteral";
import {QueryBuilder} from "../../../src/query-builder/QueryBuilder";

import {Post} from "./entity/Post";
import {Author} from "./entity/Author";

describe("github issues > #528 Migrations failing on timestamp validation", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        migrations: [__dirname + "/migrations/FirstReleaseChanges{.js,.ts}"],
        schemaCreate: true,
        dropSchemaOnConnection: true,
    }));

    it("should be success migrating", () => Promise.all(connections.map(async connection => {

        const author = new Author();
        author.firstName = "Artur";
        author.lastName = "Lavrischev";

        const post = new Post();
        post.title = "Hello!";
        post.author = author;

        await connection.getRepository(Post).save(post);
        await connection.runMigrations();
        await connection.close();

        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            // SecondReleaseChanges has older timestamp than FirstReleaseChanges
            migrations: [__dirname + "/migrations/SecondReleaseChanges{.js,.ts}"],
            schemaCreate: true
        });

    })));

    it("should be right migrations order", () => Promise.all(connections.map(async connection => {
        await connection.runMigrations();
    })));

    after(function () {
        closeTestingConnections(connections);
    });

});
