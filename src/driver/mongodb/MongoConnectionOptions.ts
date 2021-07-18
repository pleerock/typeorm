import { ReadPreference } from "mongodb";
import {BaseConnectionOptions} from "../../connection/BaseConnectionOptions";

/**
 * MongoDB specific connection options.
 * Synced with http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html
 */
export interface MongoConnectionOptions extends BaseConnectionOptions {

    /**
     * Database type.
     */
    readonly type: "mongodb";

    /**
     * Connection url where perform connection to.
     */
    readonly url?: string;

    /**
     * Database host.
     */
    readonly host?: string;

    /**
     * Database host replica set.
     */
    readonly hostReplicaSet?: string;

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
     * Set the maximum poolSize for each individual server or proxy connection.
     */
    readonly poolSize?: number;

    /**
     * Use ssl connection (needs to have a mongod server with ssl support). Default: false
     */
    readonly ssl?: boolean;

    /**
     * Validate mongod server certificate against ca (needs to have a mongod server with ssl support, 2.4 or higher).
     * Default: true
     */
    readonly sslValidate?: boolean;

    /**
     * Array of valid certificates either as Buffers or Strings
     * (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    readonly sslCA?: string[]|Buffer[];

    /**
     * String or buffer containing the certificate we wish to present
     * (needs to have a mongod server with ssl support, 2.4 or higher)
     */
    readonly sslCert?: string|Buffer;

    /**
     * String or buffer containing the certificate private key we wish to present
     * (needs to have a mongod server with ssl support, 2.4 or higher)
     */
    readonly sslKey?: string;

    /**
     * String or buffer containing the certificate password
     * (needs to have a mongod server with ssl support, 2.4 or higher)
     */
    readonly sslPass?: string|Buffer;

    /**
     * SSL Certificate revocation list binary buffer
     * (needs to have a mongod server with ssl support, 2.4 or higher)
     */
    readonly sslCRL?: string|Buffer;

    /**
     * Reconnect on error. Default: true
     */
    readonly autoReconnect?: boolean;

    /**
     * TCP Socket NoDelay option. Default: true
     */
    readonly noDelay?: boolean;

    /**
     * The number of milliseconds to wait before initiating keepAlive on the TCP socket. Default: 30000
     */
    readonly keepAlive?: number;

    /**
     * TCP Connection timeout setting. Default: 30000
     */
    readonly connectTimeoutMS?: number;

    /**
     * Version of IP stack. Can be 4, 6.
     * If undefined, will attempt to connect with IPv6, and will fall back to IPv4 on failure
     */
    readonly family?: number;

    /**
     * TCP Socket timeout setting. Default: 360000
     */
    readonly socketTimeoutMS?: number;

    /**
     * Server attempt to reconnect #times. Default 30
     */
    readonly reconnectTries?: number;

    /**
     * Server will wait #milliseconds between retries. Default 1000
     */
    readonly reconnectInterval?: number;

    /**
     * Control if high availability monitoring runs for Replicaset or Mongos proxies. Default true
     */
    readonly ha?: boolean;

    /**
     * The High availability period for replicaset inquiry. Default: 10000
     */
    readonly haInterval?: number;

    /**
     * The name of the replicaset to connect to
     */
    readonly replicaSet?: string;

    /**
     * Sets the range of servers to pick when using NEAREST (lowest ping ms + the latency fence, ex: range of 1 to (1 + 15) ms).
     * Default: 15
     */
    readonly acceptableLatencyMS?: number;

    /**
     * Sets the range of servers to pick when using NEAREST (lowest ping ms + the latency fence, ex: range of 1 to (1 + 15) ms).
     * Default: 15
     */
    readonly secondaryAcceptableLatencyMS?: number;

    /**
     * Sets if the driver should connect even if no primary is available. Default: false
     */
    readonly connectWithNoPrimary?: boolean;

    /**
     * If the database authentication is dependent on another databaseName.
     */
    readonly authSource?: string;

    /**
     * The write concern.
     */
    readonly w?: string|number;

    /**
     * The write concern timeout value.
     */
    readonly wtimeout?: number;

    /**
     * Specify a journal write concern. Default: false
     */
    readonly j?: boolean;

    /**
     * Force server to assign _id values instead of driver. Default: false
     */
    readonly forceServerObjectId?: boolean;

    /**
     * Serialize functions on any object. Default: false
     */
    readonly serializeFunctions?: boolean;

    /**
     * Specify if the BSON serializer should ignore undefined fields. Default: false
     */
    readonly ignoreUndefined?: boolean;

    /**
     * Return document results as raw BSON buffers. Default: false
     */
    readonly raw?: boolean;

    /**
     * Promotes Long values to number if they fit inside the 53 bits resolution. Default: true
     */
    readonly promoteLongs?: boolean;

    /**
     * Promotes Binary BSON values to native Node Buffers. Default: false
     */
    readonly promoteBuffers?: boolean;

    /**
     * Promotes BSON values to native types where possible, set to false to only receive wrapper types. Default: true
     */
    readonly promoteValues?: boolean;

    /**
     * Enable the wrapping of the callback in the current domain, disabled by default to avoid perf hit. Default: false
     */
    readonly domainsEnabled?: boolean;

    /**
     * Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection,
     * default is -1 which is unlimited.
     */
    readonly bufferMaxEntries?: number;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY,
     * ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readonly readPreference?: ReadPreference|string;

    /**
     * A primary key factory object for generation of custom _id keys.
     */
    readonly pkFactory?: any;

    /**
     * A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible.
     */
    readonly promiseLibrary?: any;

    /**
     * Specify a read concern for the collection. (only MongoDB 3.2 or higher supported).
     */
    readonly readConcern?: any;

    /**
     * Specify a maxStalenessSeconds value for secondary reads, minimum is 90 seconds
     */
    readonly maxStalenessSeconds?: number;

    /**
     * Specify the log level used by the driver logger (error/warn/info/debug).
     */
    readonly loggerLevel?: "error"|"warn"|"info"|"debug";

    // Do not overwrite BaseConnectionOptions.logger
    // readonly logger?: any;

    /**
     * Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function
     * Default: true
     */
    readonly checkServerIdentity?: boolean|Function;

    /**
     * Validate MongoClient passed in options for correctness. Default: false
     */
    readonly validateOptions?: boolean|any;

    /**
     * The name of the application that created this MongoClient instance. MongoDB 3.4 and newer will print this value in the server log upon establishing each connection. It is also recorded in the slow query log and profile collections
     */
    readonly appname?: string;

    /**
     * Sets the authentication mechanism that MongoDB will use to authenticate the connection
     */
    readonly authMechanism?: string;

    /**
     * Type of compression to use: snappy or zlib
     */
    readonly compression?: any;

    /**
     * Specify a file sync write concern. Default: false
     */
    readonly fsync?: boolean;

    /**
     * Read preference tags
     */
    readonly readPreferenceTags?: any[];

    /**
     * The number of retries for a tailable cursor. Default: 5
     */
    readonly numberOfRetries?: number;

    /**
     * Enable auto reconnecting for single server instances. Default: true
     */
    readonly auto_reconnect?: boolean;

    /**
     * Enable command monitoring for this client. Default: false
     */
    readonly monitorCommands?: boolean;

    /**
     * If present, the connection pool will be initialized with minSize connections, and will never dip below minSize connections
     */
    readonly minSize?: number;

    /**
     * Determines whether or not to use the new url parser. Default: false
     */
    readonly useNewUrlParser?: boolean;

    /**
     * Determines whether or not to use the new Server Discovery and Monitoring engine. Default: false
     * https://github.com/mongodb/node-mongodb-native/releases/tag/v3.2.1
     */
    readonly useUnifiedTopology?: boolean;

    /**
     * Automatic Client-Side Field Level Encryption configuration.
     */
    readonly autoEncryption?: any;
}
