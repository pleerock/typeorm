import {EntitySubscriberInterface} from "./EntitySubscriberInterface";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {QueryRunner} from "../query-runner/QueryRunner";
import {EntityMetadata} from "../metadata/EntityMetadata";
import {BroadcasterResult} from "./BroadcasterResult";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {RelationMetadata} from "../metadata/RelationMetadata";

/**
 * Broadcaster provides a helper methods to broadcast events to the subscribers.
 */
export class Broadcaster {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private queryRunner: QueryRunner) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Broadcasts "BEFORE_INSERT" event.
     * Before insert event is executed before entity is being inserted to the database for the first time.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastBeforeInsertEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral): void {

        if (entity && metadata.beforeInsertListeners.length) {
            metadata.beforeInsertListeners.forEach(listener => {
                if (listener.isAllowed(entity)) {
                    const executionResult = listener.execute(entity);
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }

        if (this.queryRunner.connection.subscribers.length) {
            this.queryRunner.connection.subscribers.forEach(subscriber => {
                if (this.isAllowedSubscriber(subscriber, metadata.target) && subscriber.beforeInsert) {
                    const executionResult = subscriber.beforeInsert({
                        connection: this.queryRunner.connection,
                        queryRunner: this.queryRunner,
                        manager: this.queryRunner.manager,
                        entity: entity,
                        metadata: metadata
                    });
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }
    }

    /**
     * Broadcasts "BEFORE_UPDATE" event.
     * Before update event is executed before entity is being updated in the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastBeforeUpdateEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, updatedColumns?: ColumnMetadata[], updatedRelations?: RelationMetadata[]): void { // todo: send relations too?
        if (entity && metadata.beforeUpdateListeners.length) {
            metadata.beforeUpdateListeners.forEach(listener => {
                if (listener.isAllowed(entity)) {
                    const executionResult = listener.execute(entity);
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }

        if (this.queryRunner.connection.subscribers.length) {
            this.queryRunner.connection.subscribers.forEach(subscriber => {
                if (this.isAllowedSubscriber(subscriber, metadata.target) && subscriber.beforeUpdate) {
                    const executionResult = subscriber.beforeUpdate({
                        connection: this.queryRunner.connection,
                        queryRunner: this.queryRunner,
                        manager: this.queryRunner.manager,
                        metadata: metadata,
                        entity: entity,
                        databaseEntity: databaseEntity,
                        updatedColumns: updatedColumns || [],
                        updatedRelations: updatedRelations || []
                    });
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }
    }

    /**
     * Broadcasts "BEFORE_REMOVE" event.
     * Before remove event is executed before entity is being removed from the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastBeforeRemoveEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral): void {
        if (entity && metadata.beforeRemoveListeners.length) {
            metadata.beforeRemoveListeners.forEach(listener => {
                if (listener.isAllowed(entity)) {
                    const executionResult = listener.execute(entity);
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }

        if (this.queryRunner.connection.subscribers.length) {
            this.queryRunner.connection.subscribers.forEach(subscriber => {
                if (this.isAllowedSubscriber(subscriber, metadata.target) && subscriber.beforeRemove) {
                    const executionResult = subscriber.beforeRemove({
                        connection: this.queryRunner.connection,
                        queryRunner: this.queryRunner,
                        manager: this.queryRunner.manager,
                        metadata: metadata,
                        entity: entity,
                        databaseEntity: databaseEntity,
                        entityId: metadata.getEntityIdMixedMap(databaseEntity)
                    });
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }
    }

    /**
     * Broadcasts "AFTER_INSERT" event.
     * After insert event is executed after entity is being persisted to the database for the first time.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastAfterInsertEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral): void {

        if (entity && metadata.afterInsertListeners.length) {
            metadata.afterInsertListeners.forEach(listener => {
                if (listener.isAllowed(entity)) {
                    const executionResult = listener.execute(entity);
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }

        if (this.queryRunner.connection.subscribers.length) {
            this.queryRunner.connection.subscribers.forEach(subscriber => {
                if (this.isAllowedSubscriber(subscriber, metadata.target) && subscriber.afterInsert) {
                    const executionResult = subscriber.afterInsert({
                        connection: this.queryRunner.connection,
                        queryRunner: this.queryRunner,
                        manager: this.queryRunner.manager,
                        entity: entity,
                        metadata: metadata
                    });
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }
    }

    /**
     * Broadcasts "AFTER_UPDATE" event.
     * After update event is executed after entity is being updated in the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastAfterUpdateEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral, updatedColumns?: ColumnMetadata[], updatedRelations?: RelationMetadata[]): void {

        if (entity && metadata.afterUpdateListeners.length) {
            metadata.afterUpdateListeners.forEach(listener => {
                if (listener.isAllowed(entity)) {
                    const executionResult = listener.execute(entity);
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }

        if (this.queryRunner.connection.subscribers.length) {
            this.queryRunner.connection.subscribers.forEach(subscriber => {
                if (this.isAllowedSubscriber(subscriber, metadata.target) && subscriber.afterUpdate) {
                    const executionResult = subscriber.afterUpdate({
                        connection: this.queryRunner.connection,
                        queryRunner: this.queryRunner,
                        manager: this.queryRunner.manager,
                        metadata: metadata,
                        entity: entity,
                        databaseEntity: databaseEntity,
                        updatedColumns: updatedColumns || [],
                        updatedRelations: updatedRelations || []
                    });
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }
    }

    /**
     * Broadcasts "AFTER_REMOVE" event.
     * After remove event is executed after entity is being removed from the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastAfterRemoveEvent(result: BroadcasterResult, metadata: EntityMetadata, entity?: ObjectLiteral, databaseEntity?: ObjectLiteral): void {

        if (entity && metadata.afterRemoveListeners.length) {
            metadata.afterRemoveListeners.forEach(listener => {
                if (listener.isAllowed(entity)) {
                    const executionResult = listener.execute(entity);
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }

        if (this.queryRunner.connection.subscribers.length) {
            this.queryRunner.connection.subscribers.forEach(subscriber => {
                if (this.isAllowedSubscriber(subscriber, metadata.target) && subscriber.afterRemove) {
                    const executionResult = subscriber.afterRemove({
                        connection: this.queryRunner.connection,
                        queryRunner: this.queryRunner,
                        manager: this.queryRunner.manager,
                        metadata: metadata,
                        entity: entity,
                        databaseEntity: databaseEntity,
                        entityId: metadata.getEntityIdMixedMap(databaseEntity)
                    });
                    if (executionResult instanceof Promise)
                        result.promises.push(executionResult);
                    result.count++;
                }
            });
        }
    }

    /**
     * Broadcasts "AFTER_LOAD" event for all given entities, and their sub-entities.
     * After load event is executed after entity has been loaded from the database.
     * All subscribers and entity listeners who listened to this event will be executed at this point.
     * Subscribers and entity listeners can return promises, it will wait until they are resolved.
     *
     * Note: this method has a performance-optimized code organization, do not change code structure.
     */
    broadcastLoadEventsForAll(result: BroadcasterResult, metadata: EntityMetadata, entities: ObjectLiteral[]): void {
        entities.forEach(entity => {
            if (entity instanceof Promise) // todo: check why need this?
                return;

            // collect load events for all children entities that were loaded with the main entity
            if (metadata.relations.length) {
                metadata.relations.forEach(relation => {

                    // in lazy relations we cannot simply access to entity property because it will cause a getter and a database query
                    if (relation.isLazy && !entity.hasOwnProperty(relation.propertyName))
                        return;

                    const value = relation.getEntityValue(entity);
                    if (value instanceof Object)
                        this.broadcastLoadEventsForAll(result, relation.inverseEntityMetadata, Array.isArray(value) ? value : [value]);
                });
            }

            if (metadata.afterLoadListeners.length) {
                metadata.afterLoadListeners.forEach(listener => {
                    if (listener.isAllowed(entity)) {
                        const executionResult = listener.execute(entity);
                        if (executionResult instanceof Promise)
                            result.promises.push(executionResult);
                        result.count++;
                    }
                });
            }

            if (this.queryRunner.connection.subscribers.length) {
                this.queryRunner.connection.subscribers.forEach(subscriber => {
                    if (this.isAllowedSubscriber(subscriber, metadata.target) && subscriber.afterLoad) {
                        const executionResult = subscriber.afterLoad!(entity, {
                            connection: this.queryRunner.connection,
                            queryRunner: this.queryRunner,
                            manager: this.queryRunner.manager,
                            entity: entity,
                            metadata: metadata
                        });
                        if (executionResult instanceof Promise)
                            result.promises.push(executionResult);
                        result.count++;
                    }
                });
            }
        });
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Checks if subscriber's methods can be executed by checking if its don't listen to the particular entity,
     * or listens our entity.
     */
    protected isAllowedSubscriber(subscriber: EntitySubscriberInterface<any>, target: Function|string): boolean {
        return  !subscriber.listenTo ||
            !subscriber.listenTo() ||
            subscriber.listenTo() === Object ||
            subscriber.listenTo() === target ||
            subscriber.listenTo().isPrototypeOf(target);
    }

}
