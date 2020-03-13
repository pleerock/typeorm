import {EntityMetadata, ObjectLiteral, EntityTarget} from "..";
import {Subject} from "../persistence/Subject";
import {SubjectChangedColumnsComputer} from "../persistence/SubjectChangedColumnsComputer";
import {QueryObserver} from "./QueryObserver";

/**
 * Executes all given observers.
 */
export class ObserverExecutor {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private observers: QueryObserver[]) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Executes given observers.
     */
    async execute(): Promise<void> {
        for (let observer of this.observers) {

            if (observer.insertEvents.length > 0) {
                await this.handleInsertEvent(observer);
                observer.insertEvents = [];
            }

            if (observer.updateEvents.length > 0) {
                await this.handleUpdateEvent(observer);
                observer.updateEvents = [];
            }

            if (observer.removeEvents.length > 0) {
                await this.handleRemoveEvent(observer);
                observer.removeEvents = [];
            }
        }
    }

    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------

    private async handleInsertEvent(observer: QueryObserver) {

        // if something new is inserted - we never know if that matches original query
        // so we execute query again and emit event if we find something new
        if (observer.type === "find") {
            await observer.connection.manager.find(observer.metadata.target as EntityTarget<any>, observer.options as any).then(entities => {
                const newEntities = this.findInserted(observer.metadata, entities, observer.lastEmitEntities);
                if (newEntities) {
                    observer.lastEmitEntities = newEntities;
                    observer.subscriptionObserver.next(observer.lastEmitEntities);
                }
            });

        } else if (observer.type === "findOne") {
            await observer.connection.manager.findOne(observer.metadata.target as EntityTarget<any>, observer.options as any).then(entity => {
                if (!entity || !observer.lastEmitEntity) {
                    if (entity === undefined && observer.lastEmitEntity === undefined) {
                        return;
                    }
                    observer.lastEmitEntity = entity;
                    observer.subscriptionObserver.next(observer.lastEmitEntity);
                    return;
                }
                const newEntities = this.findInserted(observer.metadata, [entity], [observer.lastEmitEntity]);
                if (newEntities) {
                    observer.lastEmitEntity = newEntities[0];
                    observer.subscriptionObserver.next(observer.lastEmitEntity);
                }
            });

        } else if (observer.type === "findAndCount") {
            await observer.connection.manager.findAndCount(observer.metadata.target as EntityTarget<any>, observer.options as any).then(([entities, count]) => {
                const newEntities = this.findInserted(observer.metadata, entities, observer.lastEmitEntities);
                if (newEntities || count !== observer.lastEmitCount) {
                    if (newEntities)
                        observer.lastEmitEntities = newEntities;
                    if (count !== observer.lastEmitCount)
                        observer.lastEmitCount = count;

                    observer.subscriptionObserver.next([observer.lastEmitEntities, observer.lastEmitCount]);
                }
            });

        } else if (observer.type === "count") {
            await observer.connection.manager.count(observer.metadata.target as EntityTarget<any>, observer.options as any, { observers: false }).then(count => {
                if (count !== observer.lastEmitCount) {
                    observer.lastEmitCount = count;
                    observer.subscriptionObserver.next(observer.lastEmitCount);
                }
            });
        }
    }

    private findInserted(metadata: EntityMetadata, entities: ObjectLiteral[], lastEmitEntities: ObjectLiteral[]) {

        // to make sure we won't have instance mess we try to return array of NEW entities
        // in the same NEW order we have, but with OLD instances that we can find in the
        let hasChange = false;
        entities = entities.map(entity => {
            const sameEntityInPrevious = lastEmitEntities.find(previousEntity => {
                return metadata.compareEntities(entity, previousEntity);
            });
            if (sameEntityInPrevious) {
                return sameEntityInPrevious;
            } else {
                hasChange = true;
                return entity;
            }
        });

        // if we have any new entity emit a new event
        if (hasChange)
            return entities;

        return undefined;
    }

    private async handleUpdateEvent(observer: QueryObserver) {

        // if something is updated - we check if its any entity of the queried entities
        // and if it is, we compare properties to understand if something was changed
        // and emit event if something was
        const events = observer.updateEvents;
        const hasEntities = events.every(event => {
            return event.entity && observer.metadata.hasId(event.entity);
        });
        if (hasEntities && observer.type !== "count") {
            const hasAnyEntityChanges = events.some(event => this.hasChanges(observer, event.entity));
            if (hasAnyEntityChanges === false)
                return;
        }

        if (observer.type === "find") {
            await observer.connection.manager
                .find(observer.metadata.target as EntityTarget<any>, observer.options as any)
                .then(entities => {
                    const hasChanges = entities.some(entity => this.hasChanges(observer, entity));
                    if (hasChanges || entities.length !== observer.lastEmitEntities.length) {
                        observer.lastEmitEntities = entities;
                        observer.subscriptionObserver.next(observer.lastEmitEntities);
                    }
                });

        } else if (observer.type === "findOne") {
            await observer.connection.manager
                .findOne(observer.metadata.target as EntityTarget<any>, observer.options as any)
                .then(entity => {
                    if (!entity) {
                        observer.lastEmitEntity = undefined;
                        observer.subscriptionObserver.next(observer.lastEmitEntity);
                    } else if (this.hasChanges(observer, entity)) {
                        observer.lastEmitEntity = entity;
                        observer.subscriptionObserver.next(observer.lastEmitEntity);
                    }
                });

        } else if (observer.type === "findAndCount") {
            await observer.connection.manager
                .findAndCount(observer.metadata.target as EntityTarget<any>, observer.options as any)
                .then(([entities, count]) => {

                    const hasChanges = entities.some(entity => this.hasChanges(observer, entity));
                    if (hasChanges || count !== observer.lastEmitCount || entities.length !== observer.lastEmitEntities.length) {
                        if (hasChanges || entities.length !== observer.lastEmitEntities.length)
                            observer.lastEmitEntities = entities;
                        if (count !== observer.lastEmitCount)
                            observer.lastEmitCount = count;

                        observer.subscriptionObserver.next([observer.lastEmitEntities, observer.lastEmitCount]);
                    }
                });
        } else if (observer.type === "count") {
            await observer.connection.manager
                .count(observer.metadata.target as EntityTarget<any>, observer.options as any)
                .then(count => {
                    if (count !== observer.lastEmitCount) {
                        observer.lastEmitCount = count;
                        observer.subscriptionObserver.next(observer.lastEmitCount);
                    }
                });
        }
    }

    private hasChanges(observer: QueryObserver, entity: ObjectLiteral) {

        let previousEntity: ObjectLiteral|undefined;
        if (observer.type === "find" || observer.type === "findAndCount") {
            previousEntity = observer.lastEmitEntities.find(previousEntity => {
                return observer.metadata.compareEntities(previousEntity, entity);
            });
        } else if (observer.type === "findOne") {
            previousEntity = observer.lastEmitEntity;
        }

        // if previous entity is not set it probably means it was failed off the condition first,
        // then update causes it to match the condition
        if (!previousEntity)
            return true;

        const subject = new Subject({
            metadata: observer.metadata,
            entity: entity,
            databaseEntity: previousEntity,
        });

        // find changed columns - if we have them
        new SubjectChangedColumnsComputer().compute([subject]);
        return subject.changeMaps.length > 0;
    }

    private async handleRemoveEvent(observer: QueryObserver) {

        // if something is removed we have to check:
        // - if entity with id was removed we check if its that entity
        // - if entity by query was removed we do execute original query again and differ

        const events = observer.removeEvents;
        const allEntities = events.every(event => event.entityId);
        if (allEntities && observer.type !== "count") {
            events.forEach(event => {
                if (observer.type === "find") {
                    const findPreviousEntity = observer.lastEmitEntities.find(entity => {
                        return observer.metadata.compareEntities(entity, observer.metadata.ensureEntityIdMap(event.entityId));
                    });
                    if (findPreviousEntity) {
                        observer.lastEmitEntities.splice(observer.lastEmitEntities.indexOf(findPreviousEntity), 1);
                        observer.subscriptionObserver.next(observer.lastEmitEntities);
                    }

                } else if (observer.type === "findAndCount") {
                    const findAndCountPreviousEntity = observer.lastEmitEntities.find(entity => {
                        return observer.metadata.compareEntities(entity, observer.metadata.ensureEntityIdMap(event.entityId));
                    });
                    if (findAndCountPreviousEntity) {
                        observer.lastEmitEntities.splice(observer.lastEmitEntities.indexOf(findAndCountPreviousEntity), 1);
                        observer.lastEmitCount--;
                        observer.subscriptionObserver.next([observer.lastEmitEntities, observer.lastEmitCount]);

                    }

                } else if (observer.type === "findOne") {
                    if (observer.lastEmitEntity) {
                        if (observer.metadata.compareEntities(observer.lastEmitEntity, observer.metadata.ensureEntityIdMap(event.entityId))) {
                            observer.lastEmitEntity = undefined;
                            observer.subscriptionObserver.next(observer.lastEmitEntity);
                        }
                    }
                }
            });
            return;

        } else {

            if (observer.type === "find") {
                if (!observer.lastEmitEntities.length && !observer.lastEmitCount)
                    return;

                await observer.connection.manager.find(observer.metadata.target as EntityTarget<any>, observer.options as any).then(entities => {

                    // if we have any new entity emit a new event
                    if (this.hasRemoved(observer, entities)) {
                        observer.lastEmitEntities = entities;
                        observer.subscriptionObserver.next(observer.lastEmitEntities);
                    }
                });

            } else if (observer.type === "findAndCount") {
                if (!observer.lastEmitEntities.length && !observer.lastEmitCount)
                    return;

                await observer.connection.manager.findAndCount(observer.metadata.target as EntityTarget<any>, observer.options as any).then(([entities, count]) => {

                    // if we have any new entity emit a new event
                    if (this.hasRemoved(observer, entities) || observer.lastEmitCount !== count) {
                        observer.lastEmitEntities = entities;
                        observer.lastEmitCount = count;
                        observer.subscriptionObserver.next([observer.lastEmitEntities, observer.lastEmitCount]);
                    }
                });

            } else if (observer.type === "findOne") {
                if (!observer.lastEmitEntity)
                    return;

                await observer.connection.manager.findOne(observer.metadata.target as EntityTarget<any>, observer.options as any).then(entity => {
                    if (!entity) {
                        observer.lastEmitEntity = undefined;
                        observer.subscriptionObserver.next(observer.lastEmitEntity);
                        return;
                    }

                    // if we have any new entity emit a new event
                    if (this.hasRemoved(observer, [entity])) {
                        observer.lastEmitEntity = undefined;
                        observer.subscriptionObserver.next(observer.lastEmitEntity);
                    }
                });

            } else if (observer.type === "count") {
                if (!observer.lastEmitCount)
                    return;

                await observer.connection.manager.count(observer.metadata.target as any, observer.options as any, { observers: false }).then(count => {
                    if (observer.lastEmitCount !== count) {
                        observer.lastEmitCount = count;
                        observer.subscriptionObserver.next(observer.lastEmitCount);
                    }
                });
            }

        }
    }

    private hasRemoved(observer: QueryObserver, entities: ObjectLiteral[]) {
        let hasChange = false;

        if (observer.type === "find" || observer.type === "findAndCount") {
            observer.lastEmitEntities.forEach(previousEntity => {
                const entity = entities.find(entity => {
                    return observer.metadata.compareEntities(previousEntity, entity);
                });

                if (!entity) {
                    hasChange = true;
                    observer.lastEmitEntities.splice(observer.lastEmitEntities.indexOf(previousEntity), 1);
                }
            });
        } else if (observer.type === "findOne") {
            if (!observer.lastEmitEntity)
                return false;

            const entity = entities.find(entity => {
                return observer.metadata.compareEntities(observer.lastEmitEntity!, entity);
            });
            if (!entity)
                return false;
        }

        return hasChange;
    }

}
