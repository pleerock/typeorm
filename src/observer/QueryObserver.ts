import {FindOptions, FindOptionsWhere} from "../find-options/FindOptions";
import {
    Connection,
    EntityMetadata,
    EntitySubscriberInterface,
    InsertEvent,
    ObjectLiteral,
    RemoveEvent,
    UpdateEvent,
    EntityTarget
} from "../index";
import * as Observable from "zen-observable";

// todo: we probably need operation-level subscribers
// todo: right now if we save 1000 entities within a single save call its going to call this code 1000 times
// todo: which is not efficient

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
export class QueryObserver {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    insertEvents: InsertEvent<any>[] = [];
    updateEvents: UpdateEvent<any>[] = [];
    removeEvents: RemoveEvent<any>[] = [];

    // -------------------------------------------------------------------------
    // Private Properties
    // -------------------------------------------------------------------------

    public isSubscriberActive: boolean = false;
    public lastEmitEntities: ObjectLiteral[] = [];
    public lastEmitEntity: ObjectLiteral|undefined;
    public lastEmitCount: number;
    public subscriptionObserver: ZenObservable.SubscriptionObserver<any>;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(
        public connection: Connection,
        public type: "find"|"findOne"|"findAndCount"|"count",
        public metadata: EntityMetadata,
        public options?: FindOptions<any>|FindOptionsWhere<any>,
    ) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Finds entities that match given options and returns observable.
     * Whenever new data appears that matches given query observable emits new value.
     */
    observe(): Observable<any> {
        this.connection.observers.push(this);
        return new Observable(subscriptionObserver => {
            this.subscriptionObserver = subscriptionObserver;
            this.isSubscriberActive = true;

            // we find entities matching our query
            switch (this.type) {
                case "find":
                    this.connection.manager.find(this.metadata.target as EntityTarget<any>, this.options as any).then(entities => {
                        subscriptionObserver.next(entities);
                        this.lastEmitEntities = entities;
                        this.connection.subscribers.push(this.subscriber);
                    });
                    break;

                case "findOne":
                    this.connection.manager.findOne(this.metadata.target as EntityTarget<any>, this.options as any).then(entity => {
                        subscriptionObserver.next(entity);
                        this.lastEmitEntity = entity;
                        this.connection.subscribers.push(this.subscriber);
                    });
                    break;

                case "findAndCount":
                    this.connection.manager.findAndCount(this.metadata.target as EntityTarget<any>, this.options as any).then(([entities, count]) => {
                        subscriptionObserver.next([entities, count]);
                        this.lastEmitCount = count;
                        this.lastEmitEntities = entities;
                        this.connection.subscribers.push(this.subscriber);
                    });
                    break;

                case "count":
                    this.connection.manager.count(this.metadata.target as EntityTarget<any>, this.options as any, { observers: false }).then(count => {
                        subscriptionObserver.next(count);
                        this.lastEmitCount = count;
                        this.connection.subscribers.push(this.subscriber);
                    });
                    break;
            }

            // remove subscription on cancellation
            return () => {

                // remove registered subscriber
                if (this.subscriber) {
                    const index = this.connection.subscribers.indexOf(this.subscriber);
                    if (index !== -1)
                        this.connection.subscribers.splice(index, 1);
                }

                // remove registered observer
                const index = this.connection.observers.indexOf(this);
                if (index !== -1)
                    this.connection.observers.splice(index, 1);
            };
        });
    }

    // -------------------------------------------------------------------------
    // Private Properties
    // -------------------------------------------------------------------------

    private subscriber: EntitySubscriberInterface<any> = {
        listenTo: () => {
            return this.metadata.target;
        },
        afterInsert: (event: InsertEvent<any>) => {
            if (!this.subscriptionObserver || !this.isSubscriberActive)
                return;

            this.insertEvents.push(event);
        },
        afterUpdate: event => {
            if (!this.subscriptionObserver || !this.isSubscriberActive)
                return;

            this.updateEvents.push(event);
        },
        afterRemove: event => {
            if (!this.subscriptionObserver || !this.isSubscriberActive)
                return;

            this.removeEvents.push(event);
        }
    };

}
