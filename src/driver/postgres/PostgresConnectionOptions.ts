import {BaseConnectionOptions} from "../../connection/BaseConnectionOptions";
import {PostgresConnectionCredentialsOptions} from "./PostgresConnectionCredentialsOptions";

/**
 * Postgres-specific connection options.
 */
export interface PostgresConnectionOptions extends BaseConnectionOptions, PostgresConnectionCredentialsOptions {

    /**
     * Database type.
     */
    readonly type: "postgres";

    /**
     * Schema name.
     */
    readonly schema?: string;

    /**
    * A boolean determining whether to pass time values in UTC or local time. (default: true).
    */
    readonly useUTC?: boolean;

    /**
     * Replication setup.
     */
    readonly replication?: {

        /**
         * Master server used by orm to perform writes.
         */
        readonly master: PostgresConnectionCredentialsOptions;

        /**
         * List of read-from severs (slaves).
         */
        readonly slaves: PostgresConnectionCredentialsOptions[];

    };

    /**
     * The milliseconds before a timeout occurs during the initial connection to the postgres
     * server. If undefined, or set to 0, there is no timeout. Defaults to undefined.
     */
    readonly connectTimeoutMS?: number;

    /**
     * The Postgres extension to use to generate UUID columns. Defaults to uuid-ossp.
     * If pgcrypto is selected, TypeORM will use the gen_random_uuid() function from this extension.
     * If uuid-ossp is selected, TypeORM will use the uuid_generate_v4() function from this extension.
     */
    readonly uuidExtension?: "pgcrypto" | "uuid-ossp";
    
    /**
     * The Postgres function to use to generate UUID columns. Overrides uuidExtension if provided.
     */
    readonly uuidFunction?: string;


    /*
    * Function handling errors thrown by drivers pool.
    * Defaults to logging error with `warn` level.
     */
    readonly poolErrorHandler?: (err: any) => any;

    /**
     * Include notification messages from Postgres server in client logs
     */
    readonly logNotifications?: boolean;

    /**
     * Automatically install postgres extensions
     */
     readonly installExtensions?: boolean;
}
