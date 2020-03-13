import { Connection } from "../connection/Connection";
import { SqljsDriver } from "../driver/sqljs/SqljsDriver";
import { QueryRunner } from "../query-runner/QueryRunner";
import { createLiteralEntityManager } from "./LiteralEntityManager";
import { SqljsEntityManager } from "./SqljsEntityManager";

/**
 * A special EntityManager that includes import/export and load/save function
 * that are unique to Sql.js.
 */
export function createLiteralSqljsEntityManager<Entity>({ connection, queryRunner }: {
    connection: Connection,
    queryRunner?: QueryRunner,
}): SqljsEntityManager {
    const driver = connection.driver as SqljsDriver;

    return {
        ...createLiteralEntityManager({ connection, queryRunner }),
        typeof: "SqljsEntityManager" as any, // todo: fix as any
        async loadDatabase(fileNameOrLocalStorageOrData: string | Uint8Array): Promise<void> {
            await driver.load(fileNameOrLocalStorageOrData);
        },
        async saveDatabase(fileNameOrLocalStorage?: string): Promise<void> {
            await driver.save(fileNameOrLocalStorage);
        },
        exportDatabase(): Uint8Array {
            return driver.export();
        }
    };

}
