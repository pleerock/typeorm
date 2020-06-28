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
     * Replication setup.
     */
    readonly replication?: {

        /**
         * Primary server used by orm to perform writes.
         *
         * @deprecated
         * @see primary
         */
        readonly master: PostgresConnectionCredentialsOptions;

        /**
         * List of read-from severs (replicas).
         *
         * @deprecated
         * @see replicas
         */
        readonly slaves: PostgresConnectionCredentialsOptions[];

    }|{

        /**
         * Primary server used by orm to perform writes.
         */
        readonly primary: PostgresConnectionCredentialsOptions;

        /**
         * List of read-from severs (replicas).
         */
        readonly replicas: PostgresConnectionCredentialsOptions[];
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


    /*
    * Function handling errors thrown by drivers pool.
    * Defaults to logging error with `warn` level.
     */
    readonly poolErrorHandler?: (err: any) => any;
}
