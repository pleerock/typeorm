import {EntitySchema} from "../index";

/**
 * Thrown when repository for the given class is not found.
 */
export class RepositoryNotTreeError extends Error {
    name = "RepositoryNotTreeError";

    constructor(target: Function|EntitySchema<any>|string) {
        super();
        Object.setPrototypeOf(this, RepositoryNotTreeError.prototype);
        let targetName: string;
        if (target instanceof EntitySchema) {
            targetName = target.options.name || "";
        } else if (typeof target === "function") {
            targetName = target.name;
        } else {
            targetName = target;
        }
        this.message = `Repository of the "${targetName}" class is not a TreeRepository. Try to apply @Tree decorator on your entity.`;
    }

}
