import "reflect-metadata";
import {Connection} from "../../../src/connection/Connection";
import {closeTestingConnections, createTestingConnections} from "../../utils/test-utils";

describe("github issues > #1758 Synchronization bug in PostgreSQL bug occurs when we explicitly state the default schema as 'public'", () => {

    let connections: Connection[];
    before(async () => {
        connections = await createTestingConnections({
            entities: [__dirname + "/entity/*{.js,.ts}"],
            enabledDrivers: ["postgres"],
            schema: "public",
        }).then(async connections => {
            await Promise.all(connections.map(connection => connection.synchronize(true)));
            return connections;
        });
    });
    after(() => closeTestingConnections(connections));

    it("should correctly synchronize schema when we explicitly state the default schema as 'public'", () => Promise.all(connections.map(async connection => {
        await connection.synchronize();
    })));

});
