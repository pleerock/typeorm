/**
 * Thrown if migrations lock table already exists
 */
export class MigrationsLockTableNotFound extends Error {
    name = "MigrationsLockTableNotFound";

    constructor() {
        super();
        Object.setPrototypeOf(this, MigrationsLockTableNotFound.prototype);

        this.message = `Migrations lock table not found.`;
    }

}
