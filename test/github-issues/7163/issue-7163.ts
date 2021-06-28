import "reflect-metadata";
import { assert } from "chai";
import { Connection } from "../../../src";
import {
    closeTestingConnections,
    createTestingConnections,
} from "../../utils/test-utils";
import { CalculatedDefault } from "./entity/CalculatedDefault";

describe("github issues > #7163 Allow setting a default column value evaluated within typeORM at insert time rather than database DEFAULT", () => {
    let connections: Connection[];
    before(
        async () =>
            (connections = await createTestingConnections({
                // enabledDrivers: ["postgres"], // - All drivers minus SAP (Should work but unable to test correctly locally)
                schemaCreate: true,
                dropSchema: true,
                entities: [CalculatedDefault],
            }))
    );
    after(() => closeTestingConnections(connections));

    it("should insert a row with default values generated at runtime", () =>
        Promise.all(
            connections.map(async (connection) => {
                const entity = new CalculatedDefault();
                return connection.manager.save(entity).then((saved) => {
                    assert.isNull(saved.noDefault);
                    assert.isNull(saved.defaultNull);
                    assert.isNull(saved.calculatedDefaultNull);
                    assert.strictEqual(saved.id, 1);
                    assert.strictEqual(saved.defaultString, "Hello");
                    assert.strictEqual(saved.calculatedDefaultString, "World");
                    assert.strictEqual(saved.defaultBoolean, true);
                    assert.strictEqual(saved.calculatedDefaultBoolean, false);
                    assert.strictEqual(saved.defaultNumber, 5);
                    assert.strictEqual(saved.calculatedDefaultNumber, 17);
                    assert.isAtLeast(saved.calculatedDefaultFunction, 0);
                    assert.isBelow(saved.calculatedDefaultFunction, 10);
                });
            })
        ));
});
