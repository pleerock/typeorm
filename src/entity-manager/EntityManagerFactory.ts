import { Connection } from "../connection/Connection";
import { MongoDriver } from "../driver/mongodb/MongoDriver";
import { SqljsDriver } from "../driver/sqljs/SqljsDriver";
import { QueryRunner } from "../query-runner/QueryRunner";
import { EntityManager } from "./EntityManager";
import { createLiteralEntityManager } from "./LiteralEntityManager";
import { createLiteralMongoEntityManager } from "./LiteralMongoEntityManager";
import { createLiteralSqljsEntityManager } from "./LiteralSqljsEntityManager";

/**
 * Helps to create entity managers.
 */
export class EntityManagerFactory {

    /**
     * Creates a new entity manager depend on a given connection's driver.
     */
    create(connection: Connection, queryRunner?: QueryRunner): EntityManager {
        if (connection.driver instanceof MongoDriver)
            return createLiteralMongoEntityManager({ connection });

        if (connection.driver instanceof SqljsDriver)
            return createLiteralSqljsEntityManager({ connection, queryRunner });

        return createLiteralEntityManager({ connection, queryRunner });
    }

}
