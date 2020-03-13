/**
 * Thrown when the interface is not implemented for the given adapter.
 */
export class NotImplementedError extends Error {
    name = "NotImplementedError";

    constructor() {
        super();
        Object.setPrototypeOf(this, NotImplementedError.prototype);
        this.message = "Function not implemented.";
    }
}
