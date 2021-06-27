/**
 * Thrown if migrations lock table already exists
 */
export class SkipMigrationsError extends Error {
    name = "SkipMigrationsError";

    constructor() {
        super();
        Object.setPrototypeOf(this, SkipMigrationsError.prototype);

        this.message = `Migrations lock table already exists. Skip migrations for this instance.`;
    }

}
