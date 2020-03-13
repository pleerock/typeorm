import {EntityMetadata} from "../..";
import {EntityManager} from "../../entity-manager/EntityManager";
import {Connection} from "../../connection/Connection";
import {QueryRunner} from "../../query-runner/QueryRunner";

/**
 * RemoveEvent is an object that broadcaster sends to the entity subscriber when entity is being removed to the database.
 */
export interface RemoveEvent<Entity> {

    /**
     * Connection used in the event.
     */
    connection: Connection;

    /**
     * QueryRunner used in the event transaction.
     * All database operations in the subscribed event listener should be performed using this query runner instance.
     */
    queryRunner: QueryRunner;

    /**
     * EntityManager used in the event transaction.
     * All database operations in the subscribed event listener should be performed using this entity manager instance.
     */
    manager: EntityManager;

    /**
     * Entity metadata of the removed entity.
     */
    metadata: EntityMetadata;

    /**
     * Entity that is being removed.
     * This may absent if entity is removed without being loaded (for examples by cascades).
     */
    entity?: Entity;

    /**
     * Database representation of entity that is being removed.
     */
    databaseEntity: Entity;

    /**
     * Id or ids of the entity that is being removed.
     */
    entityId?: any;

}
