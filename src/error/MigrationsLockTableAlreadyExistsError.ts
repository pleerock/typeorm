/**
 * Thrown if migrations lock table already exists
 */
export class MigrationsLockTableAlreadyExistsError extends Error {
    name = "MigrationsLockTableAlreadyExistsError";

    constructor() {
        super();
        Object.setPrototypeOf(this, MigrationsLockTableAlreadyExistsError.prototype);

        this.message = `Migrations lock table already exists.`;
    }

}
