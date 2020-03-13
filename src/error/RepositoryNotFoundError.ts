import {EntitySchema} from "../index";

/**
 * Thrown when repository for the given class is not found.
 */
export class RepositoryNotFoundError extends Error {
    name = "RepositoryNotFoundError";

    constructor(connectionName: string, entityClass: Function|EntitySchema<any>|string) {
        super();
        Object.setPrototypeOf(this, RepositoryNotFoundError.prototype);
        let targetName: string;
        if (entityClass instanceof EntitySchema || entityClass.constructor.name === "EntitySchema") {
            targetName = (entityClass as EntitySchema).options.name || "";
        } else if (typeof entityClass === "function") {
            targetName = entityClass.name;
        } else {
            targetName = entityClass;
        }
        this.message = `No repository for "${targetName}" was found. Looks like this entity is not registered in ` +
            `current "${connectionName}" connection?`;
    }

}
