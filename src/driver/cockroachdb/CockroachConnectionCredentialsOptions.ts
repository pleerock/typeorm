import {TlsOptions} from "tls";

/**
 * Cockroachdb specific connection credential options.
 */
export interface CockroachConnectionCredentialsOptions {

    /**
     * Connection url where perform connection to.
     */
    readonly url?: string;

    /**
     * Database host.
     */
    readonly host?: string;

    /**
     * Database host port.
     */
    readonly port?: number;

    /**
     * Database username.
     */
    readonly username?: string;

    /**
     * Database password.
     */
    readonly password?: string;

    /**
     * Database name to connect to.
     */
    readonly database?: string;

    /**
     * Object with ssl parameters
     */
    readonly ssl?: boolean | TlsOptions;

}
