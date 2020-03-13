import {EventEmitter, Readable, Writable} from "../../platform/PlatformTools";

/**
 * Creates a new MongoClient instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/MongoClient.html
 */
export declare class MongoClient extends EventEmitter {

    constructor(uri: string, options?: MongoClientOptions);

    /**
     * Connect to MongoDB using a url as documented at docs.mongodb.org/manual/reference/connection-string/
     * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver.
     *
     * @param url The connection URI string.
     * @param callback The command result callback.
     */
    static connect(url: string, callback: MongoCallback<Db>): void;

    /**
     * Connect to MongoDB using a url as documented at docs.mongodb.org/manual/reference/connection-string/
     * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver.
     *
     * @param url The connection URI string.
     * @param options Optional settings.
     */
    static connect(url: string, options?: MongoClientOptions): Promise<Db>;

    /**
     * Connect to MongoDB using a url as documented at docs.mongodb.org/manual/reference/connection-string/
     * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver.
     *
     * @param url The connection URI string.
     * @param options Optional settings.
     * @param callback The command result callback.
     */
    static connect(url: string, options: MongoClientOptions, callback: MongoCallback<Db>): void;

    /**
     * Connect to MongoDB using a url as documented at docs.mongodb.org/manual/reference/connection-string/
     * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver.
     */
    connect(): Promise<MongoClient>;

    /**
     * Connect to MongoDB using a url as documented at docs.mongodb.org/manual/reference/connection-string/
     * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver.
     *
     * @param url The connection URI string.
     * @param callback The command result callback.
     */
    connect(url: string, callback: MongoCallback<Db>): void;

    /**
     * Connect to MongoDB using a url as documented at docs.mongodb.org/manual/reference/connection-string/
     * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver.
     *
     * @param url The connection URI string.
     * @param options Optional settings.
     */
    connect(url: string, options?: MongoClientOptions): Promise<Db>;

    /**
     * Connect to MongoDB using a url as documented at docs.mongodb.org/manual/reference/connection-string/
     * Note that for replicasets the replicaSet query parameter is required in the 2.0 driver.
     *
     * @param url The connection URI string.
     * @param options Optional settings.
     * @param callback The command result callback.
     */
    connect(url: string, options: MongoClientOptions, callback: MongoCallback<Db>): void;

    /**
     * Close the db and its underlying connections.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#close
     */
    close(callback: MongoCallback<void>): void;

    /**
     * Close the db and its underlying connections.
     * @param force Force close, emitting no events.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#close
     */
    close(force?: boolean): Promise<void>;

    /**
     * Close the db and its underlying connections.
     * @param force Force close, emitting no events.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#close
     */
    close(force: boolean, callback: MongoCallback<void>): void;

    /**
     * Create a new Db instance sharing the current socket connections. Be aware that the new db instances are
     * related in a parent-child relationship to the original instance so that events are correctly emitted on child
     * db instances. Child db instances are cached so performing db('db1') twice will return the same instance.
     * You can control these behaviors with the options noListener and returnNonCachedInstance.
     * @param dbName The name of the database we want to use. If not provided, use database name from connection string.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#db
     */
    db(dbName?: string, options?: MongoClientCommonOption): Db;

    /**
     * Check if MongoClient is connected.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#isConnected
     */
    isConnected(options?: MongoClientCommonOption): boolean;

    /**
     * Logout user from server, fire off on all connections and remove all auth info.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#logout
     */
    logout(callback: MongoCallback<any>): void;
    logout(options?: { dbName?: string }): Promise<any>;
    logout(options: { dbName?: string }, callback: MongoCallback<any>): void;

    /**
     * Starts a new session on the server.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#startSession
     */
    startSession(options?: SessionOptions): ClientSession;

    /**
     * Create a new Change Stream, watching for new changes (insertions, updates, replacements, deletions, and invalidations) in this cluster.
     * Will ignore all changes to system collections, as well as the local, admin, and config databases.
     * @param pipeline An array of aggregation pipeline stages through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#watch
     */
    watch(pipeline?: Object[], options?: ChangeStreamOptions & { startAtClusterTime?: Timestamp, session?: ClientSession }): ChangeStream;

    /**
     * Runs a given operation with an implicitly created session. The lifetime of the session will be handled without the need for user interaction.
     * @param operation An operation to execute with an implicitly created session. The signature of this MUST be `(session) => {}`
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#withSession
     */
    withSession(operation: (session: ClientSession) => Promise<any>): Promise<void>;

    /**
     * Runs a given operation with an implicitly created session. The lifetime of the session will be handled without the need for user interaction.
     * @param options Optional settings to be appled to implicitly created session.
     * @param operation An operation to execute with an implicitly created session. The signature of this MUST be `(session) => {}`
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#withSession
     */
    withSession(options: SessionOptions, operation: (session: ClientSession) => Promise<any>): Promise<void>;
}

/**
 * The callback format for results.
 */
export interface MongoCallback<T> {

    /**
     * @param error An error instance representing the error during the execution.
     * @param result The result of execution.
     */
    (error: MongoError, result: T): void;
}

// http://mongodb.github.io/node-mongodb-native/2.1/api/MongoError.html
export declare class MongoError extends Error {
    constructor(message: string);
    static create(options: Object): MongoError;
}

/**
 * Options for MongoClient#connect method.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#.connect
 */
export interface MongoClientOptions {

    /**
     * The maximum size of the individual server pool.
     */
    poolSize?: number;

    /**
     * Enable SSL connection.
     */
    ssl?: boolean;

    /**
     * SSL Certificate store binary buffer.
     */
    sslCA?: Buffer;

    /**
     * Uri decode the user name and password for authentication.
     */
    uri_decode_auth?: boolean;

    /**
     * A hash of options to set on the db object, see Db constructor.
     */
    db?: DbCreateOptions;

    /**
     * A hash of options to set on the server objects, see Server constructor**.
     */
    server?: ServerOptions;

    /**
     * A hash of options to set on the replSet object, see ReplSet constructor**.
     */
    replSet?: ReplSetOptions;

    /**
     * A hash of options to set on the mongos object, see Mongos constructor**.
     */
    mongos?: MongosOptions;

    /**
     * A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible.
     */
    promiseLibrary?: Object;
}

export interface CommandOptions {

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * Number of milliseconds to wait before aborting the query.
     */
    maxTimeMS?: number;
}

/**
 * Options for Db class.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html
 */
export interface DbCreateOptions {

    /**
     * If the database authentication is dependent on another databaseName.
     */
    authSource?: string;

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * The current value of the parameter native_parser.
     */
    native_parser?: boolean;

    /**
     * Force server to assign _id values instead of driver.
     */
    forceServerObjectId?: boolean;

    /**
     * Serialize functions on any object.
     */
    serializeFunctions?: boolean;

    /**
     * Specify if the BSON serializer should ignore undefined fields.
     */
    ignoreUndefined?: boolean;

    /**
     * Return document results as raw BSON buffers.
     */
    raw?: boolean;

    /**
     * Promotes Long values to number if they fit inside the 53 bits resolution.
     */
    promoteLongs?: boolean;

    /**
     * Sets a cap on how many operations the driver will buffer up before giving up on getting a working connection, default is -1 which is unlimited.
     */
    bufferMaxEntries?: number;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * A primary key factory object for generation of custom _id keys.
     */
    pkFactory?: Object;

    /**
     * A Promise library class the application wishes to use such as Bluebird, must be ES6 compatible.
     */
    promiseLibrary?: Object;

    /**
     * Specify a read concern for the collection. (only MongoDB 3.2 or higher supported).
     */
    readConcern?: ReadConcern;
}

/**
 * Creates a new ReadPreference instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/ReadPreference.html
 */
export declare class ReadPreference {
    constructor(mode: string, tags: Object);

    /**
     * The ReadPreference mode as listed above.
     */
    mode: string;

    /**
     * An object representing read preference tags.
     */
    tags: any;

    /**
     * Read from primary only. All operations produce an error (throw an exception where applicable) if primary is unavailable. Cannot be combined with tags (This is the default.).
     */
    static PRIMARY: string;

    /**
     * Read from primary if available, otherwise a secondary.
     */
    static PRIMARY_PREFERRED: string;

    /**
     * Read from secondary if available, otherwise error.
     */
    static SECONDARY: string;

    /**
     * Read from a secondary if available, otherwise read from the primary.
     */
    static SECONDARY_PREFERRED: string;

    /**
     * All modes read from among the nearest candidates, but unlike other modes, NEAREST will include both the primary and all secondaries in the random selection.
     */
    static NEAREST: string;

    /**
     * Validate if a mode is legal.
     */
    isValid(mode: string): boolean;

    /**
     * Validate if a mode is legal.
     */
    static isValid(mode: string): boolean;
}

/**
 * Creates a new Server instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Server.html
 */
export interface SocketOptions {

    /**
     * Reconnect on error.
     */
    autoReconnect?: boolean;

    /**
     * TCP Socket NoDelay option.
     */
    noDelay?: boolean;

    /**
     * TCP KeepAlive on the socket with a X ms delay before start.
     */
    keepAlive?: number;

    /**
     * TCP Connection timeout setting.
     */
    connectTimeoutMS?: number;

    /**
     * TCP Socket timeout setting.
     */
    socketTimeoutMS?: number;
}

/**
 * Creates a new Server instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Server.html
 */
export interface ServerOptions {

    /**
     * Number of connections in the connection pool for each server instance, set to 5 as default for legacy reasons.
     */
    poolSize?: number;

    /**
     * Use ssl connection (needs to have a mongod server with ssl support).
     */
    ssl?: boolean;

    /**
     * Validate mongod server certificate against ca (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslValidate?: Object;

    /**
     * Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
     */
    checkServerIdentity?: boolean | Function;

    /**
     * Array of valid certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslCA?: Array<Buffer | string>;

    /**
     * String or buffer containing the certificate we wish to present (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslCert?: Buffer | string;

    /**
     * String or buffer containing the certificate private key we wish to present (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslKey?: Buffer | string;

    /**
     * String or buffer containing the certificate password (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslPass?: Buffer | string;

    /**
     * Socket options.
     */
    socketOptions?: SocketOptions;

    /**
     * Server attempt to reconnect #times.
     */
    reconnectTries?: number;

    /**
     * Server will wait # milliseconds between retries.
     */
    reconnectInterval?: number;
}

/**
 * Creates a new ReplSet instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/ReplSet.html
 */
export interface ReplSetOptions {

    /**
     * Turn on high availability monitoring.
     */
    ha?: boolean;

    /**
     * Time between each replicaset status check.
     */
    haInterval?: number;

    /**
     * The name of the replicaset to connect to.
     */
    replicaSet?: string;

    /**
     * Sets the range of servers to pick when using NEAREST (lowest ping ms + the latency fence, ex: range of 1 to (1 + 15) ms).
     */
    secondaryAcceptableLatencyMS?: number;

    /**
     * Sets if the driver should connect even if no primary is available.
     */
    connectWithNoPrimary?: boolean;

    /**
     * Number of connections in the connection pool for each server instance, set to 5 as default for legacy reasons.
     */
    poolSize?: number;

    /**
     * Use ssl connection (needs to have a mongod server with ssl support).
     */
    ssl?: boolean;

    /**
     * Validate mongod server certificate against ca (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslValidate?: Object;

    /**
     * Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
     */
    checkServerIdentity?: boolean | Function;

    /**
     * Array of valid certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslCA?: Array<Buffer | string>;

    /**
     * String or buffer containing the certificate we wish to present (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslCert?: Buffer | string;

    /**
     * String or buffer containing the certificate private key we wish to present (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslKey?: Buffer | string;

    /**
     * String or buffer containing the certificate private key we wish to present (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslPass?: Buffer | string;

    /**
     * Socket options.
     */
    socketOptions?: SocketOptions;
}

/**
 * Creates a new Mongos instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Mongos.html
 */
export interface MongosOptions {

    /**
     * Turn on high availability monitoring.
     */
    ha?: boolean;

    /**
     * Time between each replicaset status check.
     */
    haInterval?: number;

    /**
     * Number of connections in the connection pool for each server instance, set to 5 as default for legacy reasons.
     */
    poolSize?: number;

    /**
     * Use ssl connection (needs to have a mongod server with ssl support).
     */
    ssl?: boolean;

    /**
     * Validate mongod server certificate against ca (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslValidate?: Object;

    /**
     * Ensure we check server identify during SSL, set to false to disable checking. Only works for Node 0.12.x or higher. You can pass in a boolean or your own checkServerIdentity override function.
     */
    checkServerIdentity?: boolean | Function;

    /**
     * Array of valid certificates either as Buffers or Strings (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslCA?: Array<Buffer | string>;

    /**
     * String or buffer containing the certificate we wish to present (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslCert?: Buffer | string;

    /**
     * String or buffer containing the certificate private key we wish to present (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslKey?: Buffer | string;

    /**
     * String or buffer containing the certificate password (needs to have a mongod server with ssl support, 2.4 or higher).
     */
    sslPass?: Buffer | string;

    /**
     * Socket options.
     */
    socketOptions?: SocketOptions;
}

export interface DbOptions {

    /**
     * Do not make the db an event listener to the original connection.
     */
    noListener?: boolean;

    /**
     * Control if you want to return a cached instance or have a new one created.
     */
    returnNonCachedInstance?: boolean;
}

export interface IndexInformationOptions {

    /**
     * Returns the full raw index information.
     */
    full?: boolean;

    /**
     * The preferred read preference (ReadPreference.PRIMARY,
     * ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY,
     * ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;
}

export interface ExecuteDbAdminCommandOptions {

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    // maxTimeMS?: number;
}

export interface ListCollectionsOptions {

    /**
     * The batchSize for the returned command cursor or if pre 2.8 the systems batch collection.
     */
    batchSize?: number;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;
}

/**
 * Db.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html
 */
export declare class Db extends EventEmitter {

    /**
     *
     * @param databaseName The name of the database this instance represents.
     * @param serverConfig The server topology for the database.
     * @param options Optional.
     */
    constructor(databaseName: string, serverConfig: Server | ReplSet | Mongos, options?: DbCreateOptions);

    /**
     * Get the current db topology.
     */
    serverConfig: Server | ReplSet | Mongos;

    /**
     * Current bufferMaxEntries value for the database.
     */
    bufferMaxEntries: number;

    /**
     * The name of the database this instance represents.
     */
    databaseName: string;

    /**
     * The options associated with the db instance.
     */
    options: any;

    /**
     * The current value of the parameter native_parser.
     */
    native_parser: boolean;

    /**
     * The current slaveOk value for the db instance.
     */
    slaveOk: boolean;

    /**
     * The current write concern values.
     */
    writeConcern: WriteConcern;

    /**
     * Add a user to the database.
     *
     * @param username The username.
     * @param password The password.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#addUser
     */
    addUser(username: string, password: string, callback: MongoCallback<any>): void;

    /**
     * Add a user to the database.
     *
     * @param username The username.
     * @param password The password.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#addUser
     */
    addUser(username: string, password: string, options?: DbAddUserOptions): Promise<any>;

    /**
     * Add a user to the database.
     *
     * @param username The username.
     * @param password The password.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#addUser
     */
    addUser(username: string, password: string, options: DbAddUserOptions, callback: MongoCallback<any>): void;

    /**
     * Return the Admin db instance.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#admin
     */
    admin(): Admin;

    /**
     * Authenticate a user against the server.
     *
     * @param userName The username.
     * @param password The password.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#authenticate
     */
    authenticate(userName: string, password: string, callback: MongoCallback<any>): void;

    /**
     * Authenticate a user against the server.
     *
     * @param userName The username.
     * @param password The password.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#authenticate
     */
    authenticate(userName: string, password: string, options?: { authMechanism: string }): Promise<any>;

    /**
     * Authenticate a user against the server.
     *
     * @param userName The username.
     * @param password The password.
     * @param password
     * @param options
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#authenticate
     */
    authenticate(userName: string, password: string, options: { authMechanism: string }, callback: MongoCallback<any>): void;

    /**
     * Close the db and its underlying connections.
     *
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#close
     */
    close(callback: MongoCallback<void>): void;

    /**
     * Close the db and its underlying connections.
     *
     * @param forceClose Force close, emitting no events.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#close
     */
    close(forceClose?: boolean): Promise<void>;

    /**
     * Close the db and its underlying connections.
     *
     * @param forceClose Force close, emitting no events.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#close
     */
    close(forceClose: boolean, callback: MongoCallback<void>): void;

    /**
     * Fetch a specific collection (containing the actual collection information). If the application does not use strict mode you can
     * can use it without a callback in the following way: var collection = db.collection('mycollection');
     *
     * @param name The collection name we wish to access.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#collection
     */
    collection(name: string): Collection<any>;

    /**
     * Fetch a specific collection (containing the actual collection information). If the application does not use strict mode you can
     * can use it without a callback in the following way: var collection = db.collection('mycollection');
     *
     * @param name The collection name we wish to access.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#collection
     */
    collection(name: string, callback: MongoCallback<Collection<any>>): Collection<any>;

    /**
     * Fetch a specific collection (containing the actual collection information). If the application does not use strict mode you can
     * can use it without a callback in the following way: var collection = db.collection('mycollection');
     *
     * @param name The collection name we wish to access.
     * @param options Optional settings.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#collection
     */
    collection(name: string, options: DbCollectionOptions, callback: MongoCallback<Collection<any>>): Collection<any>;

    /**
     * Fetch all collections for the current db.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#collections
     */
    collections(): Promise<Collection<any>[]>;

    /**
     * Fetch all collections for the current db.
     *
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#collections
     */
    collections(callback: MongoCallback<Collection<any>[]>): void;

    /**
     * Execute a command.
     *
     * @param command The command hash.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#command
     */
    command(command: Object, callback: MongoCallback<any>): void;

    /**
     * Execute a command.
     *
     * @param command The command hash.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#command
     */
    command(command: Object, options?: { readPreference: ReadPreference | string }): Promise<any>;

    /**
     * Execute a command.
     *
     * @param command The command hash.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#command
     */
    command(command: Object, options: { readPreference: ReadPreference | string }, callback: MongoCallback<any>): void;

    /**
     * Create a new collection on a server with the specified options. Use this to create capped collections.
     *
     * @param name The collection name we wish to access.
     * @param callback The results callback
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#createCollection
     */
    createCollection(name: string, callback: MongoCallback<Collection<any>>): void;

    /**
     * Create a new collection on a server with the specified options. Use this to create capped collections.
     *
     * @param name The collection name we wish to access.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#createCollection
     */
    createCollection(name: string, options?: CollectionCreateOptions): Promise<Collection<any>>;

    /**
     * Create a new collection on a server with the specified options. Use this to create capped collections.
     *
     * @param name The collection name we wish to access.
     * @param options Optional settings.
     * @param callback The results callback
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#createCollection
     */
    createCollection(name: string, options: CollectionCreateOptions, callback: MongoCallback<Collection<any>>): void;

    /**
     * Creates an index on the db and collection collection.
     *
     * @param name Name of the collection to create the index on.
     * @param fieldOrSpec Defines the index.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#createIndex
     */
    createIndex(name: string, fieldOrSpec: string | Object, callback: MongoCallback<any>): void;

    /**
     * Creates an index on the db and collection collection.
     *
     * @param name Name of the collection to create the index on.
     * @param fieldOrSpec Defines the index.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#createIndex
     */
    createIndex(name: string, fieldOrSpec: string | Object, options?: MongodbIndexOptions): Promise<any>;

    /**
     * Creates an index on the db and collection collection.
     *
     * @param name Name of the collection to create the index on.
     * @param fieldOrSpec Defines the index.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#createIndex
     */
    createIndex(name: string, fieldOrSpec: string | Object, options: MongodbIndexOptions, callback: MongoCallback<any>): void;

    /**
     * Create a new Db instance sharing the current socket connections. Be aware that the new db instances are
     * related in a parent-child relationship to the original instance so that events are correctly emitted on child
     * db instances. Child db instances are cached so performing db('db1') twice will return the same instance.
     * You can control these behaviors with the options noListener and returnNonCachedInstance.
     *
     * @param dbName The name of the database we want to use.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#db
     */
    db(dbName: string): Db;

    /**
     * Create a new Db instance sharing the current socket connections. Be aware that the new db instances are
     * related in a parent-child relationship to the original instance so that events are correctly emitted on child
     * db instances. Child db instances are cached so performing db('db1') twice will return the same instance.
     * You can control these behaviors with the options noListener and returnNonCachedInstance.
     *
     * @param dbName The name of the database we want to use.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#db
     */
    db(dbName: string, options: DbOptions): Db;

    /**
     * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
     *
     * @param name Name of collection to drop.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#dropCollection
     */
    dropCollection(name: string): Promise<boolean>;

    /**
     * Drop a collection from the database, removing it permanently. New accesses will create a new collection.
     *
     * @param name Name of collection to drop.
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#dropCollection
     */
    dropCollection(name: string, callback: MongoCallback<boolean>): void;

    /**
     * Drop a database, removing it permanently from the server.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#dropDatabase
     */
    dropDatabase(): Promise<any>;

    /**
     * Drop a database, removing it permanently from the server.
     *
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#dropDatabase
     */
    dropDatabase(callback: MongoCallback<any>): void;

    // deprecated http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#ensureIndex
    // ensureIndex(collectionName: any, fieldOrSpec: any, options: IndexOptions, callback: Function): void;
    // deprecated http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#eval
    // eval(code: any, parameters: any[], options?: any, callback?: MongoCallback<any>): void;

    /**
     * Runs a command on the database as admin.
     *
     * @param command The command hash.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#executeDbAdminCommand
     */
    executeDbAdminCommand(command: Object, callback: MongoCallback<any>): void;

    /**
     * Runs a command on the database as admin.
     *
     * @param command The command hash.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#executeDbAdminCommand
     */
    executeDbAdminCommand(command: Object, options?: ExecuteDbAdminCommandOptions): Promise<any>;

    /**
     * Runs a command on the database as admin.
     *
     * @param command The command hash.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#executeDbAdminCommand
     */
    executeDbAdminCommand(command: Object, options: ExecuteDbAdminCommandOptions, callback: MongoCallback<any>): void;

    /**
     * Retrieves this collections index info.
     *
     * @param name The name of the collection.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#indexInformation
     */
    indexInformation(name: string, callback: MongoCallback<any>): void;

    /**
     * Retrieves this collections index info.
     *
     * @param name The name of the collection.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#indexInformation
     */
    indexInformation(name: string, options?: IndexInformationOptions): Promise<any>;

    /**
     * Retrieves this collections index info.
     *
     * @param name The name of the collection.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#indexInformation
     */
    indexInformation(name: string, options: IndexInformationOptions, callback: MongoCallback<any>): void;

    /**
     * Get the list of all collection information for the specified db.
     *
     * @param filter Query to filter collections by.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#listCollections
     */
    listCollections(filter: Object, options?: ListCollectionsOptions): CommandCursor;

    /**
     * Logout user from server, fire off on all connections and remove all auth info.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#logout
     */
    logout(callback: MongoCallback<any>): void;

    /**
     * Logout user from server, fire off on all connections and remove all auth info.
     *
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#logout
     */
    logout(options?: { dbName?: string }): Promise<any>;

    /**
     * Logout user from server, fire off on all connections and remove all auth info.
     *
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#logout
     */
    logout(options: { dbName?: string }, callback: MongoCallback<any>): void;

    /**
     * Open the database.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#open
     */
    open(): Promise<Db>;

    /**
     * Open the database
     *
     * @param callback Callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#open
     */
    open(callback: MongoCallback<Db>): void;


    /**
     *
     * @param username
     * @param callback
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#removeUser
     */
    removeUser(username: string, callback: MongoCallback<any>): void;
    removeUser(username: string, options?: { w?: number | string, wtimeout?: number, j?: boolean }): Promise<any>;
    removeUser(username: string, options: { w?: number | string, wtimeout?: number, j?: boolean }, callback: MongoCallback<any>): void;

    /**
     * Rename a collection.
     *
     * @param fromCollection Name of current collection to rename.
     * @param toCollection New name of of the collection.
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#renameCollection
     */
    renameCollection(fromCollection: string, toCollection: string, callback: MongoCallback<Collection<any>>): void;

    /**
     * Rename a collection.
     *
     * @param fromCollection Name of current collection to rename.
     * @param toCollection New name of of the collection.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#renameCollection
     */
    renameCollection(fromCollection: string, toCollection: string, options?: { dropTarget?: boolean }): Promise<Collection<any>>;

    /**
     * Rename a collection.
     *
     * @param fromCollection Name of current collection to rename.
     * @param toCollection New name of of the collection.
     * @param options Optional settings.
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#renameCollection
     */
    renameCollection(fromCollection: string, toCollection: string, options: { dropTarget?: boolean }, callback: MongoCallback<Collection<any>>): void;

    /**
     * Get all the db statistics.
     *
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#stats
     */
    stats(callback: MongoCallback<any>): void;

    /**
     * Get all the db statistics.
     *
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#stats
     */
    stats(options?: { scale?: number }): Promise<any>;

    /**
     * Get all the db statistics.
     *
     * @param options Optional settings.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#stats
     */
    stats(options: { scale?: number }, callback: MongoCallback<any>): void;

    /**
     * Create a new Change Stream, watching for new changes (insertions, updates, replacements, deletions, and invalidations) in this database. Will ignore all changes to system collections.
     * @param pipeline An array of aggregation pipeline stages through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#watch
     */
    watch(pipeline?: Object[], options?: ChangeStreamOptions & { startAtClusterTime?: Timestamp, session?: ClientSession }): ChangeStream;
}

/**
 * Server.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Server.html
 */
export declare class Server extends EventEmitter {

    /**
     *
     * @param host The host for the server, can be either an IP4, IP6 or domain socket style host.
     * @param port The server port if IP4.
     * @param options Optional.
     */
    constructor(host: string, port: number, options?: ServerOptions);

    /**
     * All raw connections.
     */
    connections(): Array<any>;
}

/**
 * ReplSet.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/ReplSet.html
 */
export declare class ReplSet extends EventEmitter {

    /**
     *
     * @param servers A seedlist of servers participating in the replicaset.
     * @param options Optional.
     */
    constructor(servers: Array<Server>, options?: ReplSetOptions);

    /**
     * All raw connections
     */
    connections(): Array<any>;
}

/**
 * Mongos.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Mongos.html
 */
export declare class Mongos extends EventEmitter {

    /**
     *
     * @param servers A seedlist of servers participating in the replicaset.
     * @param options Optional.
     */
    constructor(servers: Array<Server>, options?: MongosOptions);

    /**
     * All raw connections
     */
    connections(): Array<any>;
}

/**
 * Creates a new Db instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#addUser
 */
export interface DbAddUserOptions {

    /**
     * The write concern.
     */
    w?: string | number;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Custom data associated with the user (only Mongodb 2.6 or higher).
     */
    customData?: Object;

    /**
     * Roles associated with the created user (only Mongodb 2.6 or higher).
     */
    roles?: Object[];
}

/**
 * Creates a new Db instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#createCollection
 */
export interface CollectionCreateOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Return document results as raw BSON buffers.
     */
    raw?: boolean;

    /**
     * A primary key factory object for generation of custom _id keys.
     */
    pkFactory?: Object;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * Serialize functions on any object.
     */
    serializeFunctions?: boolean;

    /**
     * Returns an error if the collection does not exist.
     */
    strict?: boolean;

    /**
     * Create a capped collection.
     */
    capped?: boolean;

    /**
     * The size of the capped collection in bytes.
     */
    size?: number;

    /**
     * The maximum number of documents in the capped collection.
     */
    max?: number;

    /**
     * Create an index on the _id field of the document, True by default on MongoDB 2.2 or higher off for version < 2.2.
     */
    autoIndexId?: boolean;
}

/**
 * Creates a new Db instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#collection
 */
export interface DbCollectionOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Return document results as raw BSON buffers.
     */
    raw?: boolean;

    /**
     * A primary key factory object for generation of custom _id keys.
     */
    pkFactory?: Object;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED, ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * Serialize functions on any object.
     */
    serializeFunctions?: boolean;

    /**
     * Returns an error if the collection does not exist.
     */
    strict?: boolean;

    /**
     * Specify a read concern for the collection. (only MongoDB 3.2 or higher supported).
     */
    readConcern?: ReadConcern;
}

/**
 * Creates an index on the db and collection collection.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Db.html#createIndex
 */
export interface MongodbIndexOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Creates an unique index.
     */
    unique?: boolean;

    /**
     * Creates a sparse index.
     */
    sparse?: boolean;

    /**
     * Creates the index in the background, yielding whenever possible.
     */
    background?: boolean;

    /**
     * A unique index cannot be created on a key that has pre-existing duplicate values.
     * If you would like to create the index anyway, keeping the first document
     * the database indexes and deleting all subsequent documents that have duplicate value.
     */
    dropDups?: boolean;

    /**
     * For geospatial indexes set the lower bound for the co-ordinates.
     */
    min?: number;

    /**
     * For geospatial indexes set the high bound for the co-ordinates.
     */
    max?: number;

    /**
     * Specify the format version of the indexes.
     */
    v?: number;

    /**
     * Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher).
     */
    expireAfterSeconds?: number;

    /**
     * Override the autogenerated index name (useful if the resulting name is larger than 128 bytes).
     */
    name?: string;

}

/**
 * Admin.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html
 */
export interface Admin {

    /**
     * Add a user to the database.
     *
     * @param username The username.
     * @param password The password.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#addUser
     */
    addUser(username: string, password: string, callback: MongoCallback<any>): void;

    /**
     * Add a user to the database.
     *
     * @param username The username.
     * @param password The password.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#addUser
     */
    addUser(username: string, password: string, options?: AddUserOptions): Promise<any>;

    /**
     * Add a user to the database.
     *
     * @param username The username.
     * @param password The password.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#addUser
     */
    addUser(username: string, password: string, options: AddUserOptions, callback: MongoCallback<any>): void;

    /**
     * Authenticate a user against the server.
     *
     * @param username The username.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#authenticate
     */
    authenticate(username: string, callback: MongoCallback<any>): void;

    /**
     * Authenticate a user against the server.
     *
     * @param username The username.
     * @param password The password.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#authenticate
     */
    authenticate(username: string, password?: string): Promise<any>;

    /**
     * Authenticate a user against the server.
     *
     * @param username The username.
     * @param password The password.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#authenticate
     */
    authenticate(username: string, password: string, callback: MongoCallback<any>): void;

    /**
     * Retrieve the server information for the current instance of the db client
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#buildInfo
     */
    buildInfo(): Promise<any>;

    /**
     * Retrieve the server information for the current instance of the db client
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#buildInfo
     */
    buildInfo(callback: MongoCallback<any>): void;

    /**
     * Execute a command.
     *
     * @param command The command hash.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#command
     */
    command(command: Object, callback: MongoCallback<any>): void;

    /**
     * Execute a command.
     *
     * @param command The command hash.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#command
     */
    command(command: Object, options?: CommandOptions): Promise<any>;

    /**
     * Execute a command.
     *
     * @param command The command hash.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#command
     */
    command(command: Object, options: CommandOptions, callback: MongoCallback<any>): void;

    /**
     * List the available databases.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#listDatabases
     */
    listDatabases(): Promise<any>;

    /**
     * List the available databases.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#listDatabases
     */
    listDatabases(callback: MongoCallback<any>): void;

    /**
     * Logout user from server, fire off on all connections and remove all auth info.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#logout.
     */
    logout(): Promise<any>;

    /**
     * Logout user from server, fire off on all connections and remove all auth info.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#logout.
     */
    logout(callback: MongoCallback<any>): void;

    /**
     * Ping the MongoDB server and retrieve results.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#ping
     */
    ping(): Promise<any>;

    /**
     * Ping the MongoDB server and retrieve results.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#ping
     */
    ping(callback: MongoCallback<any>): void;

    /**
     * Retrive the current profiling information for MongoDB.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#profilingInfo
     */
    profilingInfo(): Promise<any>;

    /**
     * Retrive the current profiling information for MongoDB.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#profilingInfo
     */
    profilingInfo(callback: MongoCallback<any>): void;

    /**
     * Retrieve the current profiling Level for MongoDB.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#profilingLevel
     */
    profilingLevel(): Promise<any>;

    /**
     * Retrieve the current profiling Level for MongoDB.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#profilingLevel
     */
    profilingLevel(callback: MongoCallback<any>): void;

    /**
     * Remove a user from a database.
     *
     * @param username The username.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#removeUser
     */
    removeUser(username: string, callback: MongoCallback<any>): void;

    /**
     * Remove a user from a database.
     *
     * @param username The username.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#removeUser
     */
    removeUser(username: string, options?: FSyncOptions): Promise<any>;

    /**
     * Remove a user from a database.
     *
     * @param username The username.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#removeUser
     */
    removeUser(username: string, options: FSyncOptions, callback: MongoCallback<any>): void;

    /**
     * Get ReplicaSet status.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#replSetGetStatus
     */
    replSetGetStatus(): Promise<any>;

    /**
     * Get ReplicaSet status.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#replSetGetStatus
     */
    replSetGetStatus(callback: MongoCallback<any>): void;

    /**
     * Retrieve the server information for the current
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#serverInfo
     */
    serverInfo(): Promise<any>;

    /**
     * instance of the db client
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#serverInfo
     * @param callback The command result callback.
     */
    serverInfo(callback: MongoCallback<any>): void;

    /**
     * Retrieve this db's server status.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#serverStatus
     */
    serverStatus(): Promise<any>;

    /**
     * Retrieve this db's server status.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#serverStatus
     */
    serverStatus(callback: MongoCallback<any>): void;

    /**
     * Set the current profiling level of MongoDB.
     *
     * @param level The new profiling level (off, slow_only, all).
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#setProfilingLevel
     */
    setProfilingLevel(level: string): Promise<any>;

    /**
     * Set the current profiling level of MongoDB.
     *
     * @param level The new profiling level (off, slow_only, all).
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#setProfilingLevel
     */
    setProfilingLevel(level: string, callback: MongoCallback<any>): void;

    /**
     * Validate an existing collection
     *
     * @param collectionNme The name of the collection to validate.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#validateCollection
     */
    validateCollection(collectionNme: string, callback: MongoCallback<any>): void;

    /**
     * Validate an existing collection
     *
     * @param collectionNme The name of the collection to validate.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#validateCollection
     */
    validateCollection(collectionNme: string, options?: Object): Promise<any>;

    /**
     * Validate an existing collection
     *
     * @param collectionNme The name of the collection to validate.
     * @param options Optional settings.
     * @param callback The command result callback
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#validateCollection
     */
    validateCollection(collectionNme: string, options: Object, callback: MongoCallback<any>): void;
}

/**
 * Add a user to the database.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#addUser
 */
export interface AddUserOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Specify a file sync write concern.
     */
    fsync: boolean;

    /**
     * Custom data associated with the user (only Mongodb 2.6 or higher).
     */
    customData?: Object;

    /**
     * Roles associated with the created user (only Mongodb 2.6 or higher).
     */
    roles?: Object[];
}
export interface ListIndexesOptions {

    /**
     * The batchSize for the returned command cursor or if pre 2.8 the systems batch collection.
     */
    batchSize?: number;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;
}

export interface GroupOptions {

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;
}

/**
 * Remove a user from a database.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Admin.html#removeUser
 */
export interface FSyncOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Specify a file sync write concern.
     */
    fsync?: boolean;
}

export interface FindOneAndDeleteOptions {

    /**
     * Limits the fields to return for all matching documents.
     */
    projection?: Object;

    /**
     * Determines which document the operation modifies if the query selects multiple documents.
     */
    sort?: Object;

    /**
     * The maximum amount of time to allow the query to run.
     */
    maxTimeMS?: number;
}

/**
 * Create a new ObjectID instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/ObjectID.html
 */
export declare class ObjectID {
    constructor(s?: string | number);

    /**
     * The generation time of this ObjectId instance.
     */
    generationTime: number;

    /**
     * Creates an ObjectID from a hex string representation of an ObjectID.
     */
    static createFromHexString(hexString: string): ObjectID;

    /**
     * Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
     */
    static createFromTime(time: number): ObjectID;

    /**
     * Checks if a value is a valid bson ObjectId.
     */
    static isValid(id: any): boolean;

    /**
     * Compares the equality of this ObjectID with otherID.
     */
    equals(otherID: ObjectID): boolean;

    /**
     * Generate a 12 byte id buffer used in ObjectID's.
     */
    generate(time?: number): string;

    /**
     * Returns the generation date (accurate up to the second) that this ID was generated.
     *
     */
    getTimestamp(): Date;

    /**
     * Return the ObjectID id as a 24 byte hex string representation.
     */
    toHexString(): string;

    /**
     * Get the timestamp and validate correctness.
     */
    toString(): string;
}

/**
 * A class representation of the BSON Binary type.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Binary.html
 */
export declare class Binary {

    /**
     * @param buffer A buffer object containing the binary data.
     * @param subType The option binary type.
     */
    constructor(buffer: Buffer, subType?: number);

    /**
     * Byte Array BSON type.
     */
    static SUBTYPE_BYTE_ARRAY: number;

    /**
     * Default BSON type.
     */
    static SUBTYPE_DEFAULT: number;

    /**
     * Function BSON type.
     */
    static SUBTYPE_FUNCTION: number;

    /**
     * MD5 BSON type.
     */
    static SUBTYPE_MD5: number;

    /**
     * User BSON type.
     */
    static SUBTYPE_USER_DEFINED: number;

    /**
     * UUID BSON type.
     */
    static SUBTYPE_UUID: number;

    /**
     * OLD UUID BSON type
     */
    static SUBTYPE_UUID_OLD: number;

    /**
     * The length of the binary.
     */
    length(): number;

    /**
     * Updates this binary with byte_value.
     *
     * @param byte_value A single byte we wish to write.
     */
    put(byte_value: number | string): void;

    /**
     * Reads length bytes starting at position.
     *
     * @param position Read from the given position in the Binary.
     * @param length The number of bytes to read.
     */
    read(position: number, length: number): Buffer;

    /**
     * Returns the value of this binary as a string.
     */
    value(): string;

    /**
     * Writes a buffer or string to the binary
     *
     * @param buffer A string or buffer to be written to the Binary BSON object.
     * @param offset Specify the binary of where to write the content.
     */
    write(buffer: Buffer | string, offset: number): void;
}
/**
 * A class representation of the BSON Double type.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Double.html
 */
export declare class Double {

    /**
     * @param value The number we want to represent as a double.
     */
    constructor(value: number);

    /**
     * Access the number value.
     */
    valueOf(): number;
}

/**
 * Long
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Long.html
 */
export declare class Long {

    /**
     * @param low The low (signed) 32 bits of the Long.
     * @param high The high (signed) 32 bits of the Long.
     */
    constructor(low: number, high: number);

    static MAX_VALUE: Long;
    static MIN_VALUE: Long;
    static NEG_ONE: Long;
    static ONE: Long;
    static ZERO: Long;

    /**
     * Returns a Long representing the 64-bit integer that comes by concatenating the given high and low bits.
     * Each is assumed to use 32 bits.
     *
     * @param lowBits The low 32-bits.
     * @param highBits The high 32-bits.
     */
    static fromBits(lowBits: number, highBits: number): Long;

    /**
     * Returns a Long representing the given (32-bit) integer value.
     *
     * @param value The 32-bit integer in question.
     */
    static fromInt(value: number): Long;

    /**
     * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
     *
     * @param value The number in question.
     */
    static fromNumber(value: number): Long;

    /**
     * Returns a Long representation of the given string, written using the given radix.
     *
     * @param str The textual representation of the Long.
     * @param radix The radix in which the text is written.
     */
    static fromString(str: string, radix?: number): Long;

    /**
     * Returns the sum of this and the given Long.
     *
     * @param other Long to add to this one.
     */
    add(other: Long): Long;

    /**
     * Returns the bitwise-AND of this Long and the given one.
     *
     * @param other The Long with which to AND.
     */
    and(other: Long): Long;

    /**
     * Compares this Long with the given one.
     *
     * @param other Long to compare against.
     */
    compare(other: Long): number;

    /**
     * Returns this Long divided by the given one.
     *
     * @param other Long by which to divide.
     */
    div(other: Long): Long;

    /**
     * Return whether this Long equals the other.
     *
     * @param other Long to compare against.
     */
    equals(other: Long): boolean;

    /**
     * Return the high 32-bits value.
     */
    getHighBits(): number;

    /**
     * Return the low 32-bits value.
     */
    getLowBits(): number;

    /**
     * Return the low unsigned 32-bits value.
     */
    getLowBitsUnsigned(): number;

    /**
     * Returns the number of bits needed to represent the absolute value of this Long.
     */
    getNumBitsAbs(): number;

    /**
     * Return whether this Long is greater than the other.
     *
     * @param other Long to compare against.
     */
    greaterThan(other: Long): number;

    /**
     * Return whether this Long is greater than or equal to the other.
     *
     * @param other Long to compare against.
     */
    greaterThanOrEqual(other: Long): number;

    /**
     * Return whether this value is negative.
     */
    isNegative(): boolean;

    /**
     * Return whether this value is odd.
     */
    isOdd(): boolean;

    /**
     * Return whether this value is zero.
     */
    isZero(): boolean;

    /**
     * Return whether this Long is less than the other.
     *
     * @param other Long to compare against.
     */
    lessThan(other: Long): boolean;

    /**
     * Return whether this Long is less than or equal to the other.
     *
     * @param other Long to compare against.
     */
    lessThanOrEqual(other: Long): boolean;

    /**
     * Returns this Long modulo the given one.
     *
     * @param other Long by which to mod.
     */
    modulo(other: Long): Long;

    /**
     * Returns the product of this and the given Long.
     *
     * @param other Long to multiply with this.
     */
    multiply(other: Long): Long;

    /**
     * The negation of this value.
     */
    negate(): Long;

    /**
     * The bitwise-NOT of this value.
     */
    not(): Long;

    /**
     * Return whether this Long does not equal the other.
     *
     * @param other Long to compare against.
     */
    notEquals(other: Long): boolean;

    /**
     * Returns the bitwise-OR of this Long and the given one.
     *
     * @param other The Long with which to OR.
     */
    or(other: Long): Long;

    /**
     * Returns this Long with bits shifted to the left by the given amount.
     *
     * @param other The number of bits by which to shift.
     */
    shiftLeft(other: number): Long;

    /**
     * Returns this Long with bits shifted to the right by the given amount.
     *
     * @param other The number of bits by which to shift.
     */
    shiftRight(other: number): Long;

    /**
     * Returns this Long with bits shifted to the right by the given amount, with the new top bits matching the current sign bit.
     *
     * @param other The number of bits by which to shift.
     */
    shiftRightUnsigned(other: number): Long;

    /**
     * Returns the difference of this and the given Long.
     *
     * @param other Long to subtract from this.
     */
    subtract(other: Long): Long;

    /**
     * Return the int value.
     */
    toInt(): number;

    /**
     * Return the JSON value.
     */
    toJSON(): string;

    /**
     * Return the Number value.
     */
    toNumber(): number;

    /**
     * Return the String value.
     *
     * @param opt_radix The radix in which the text should be written.
     */
    toString(opt_radix?: number): string;

    /**
     * Returns the bitwise-XOR of this Long and the given one.
     *
     * @param other The Long with which to XOR.
     */
    xor(other: Long): Long;
}

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/MaxKey.html
 */
export declare class MaxKey { }

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/MinKey.html
 */
export declare class MinKey { }

/**
 * Timestamp.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Timestamp.html
 */
export declare class Timestamp {

    /**
     * @param low The low (signed) 32 bits of the Timestamp.
     * @param high The high (signed) 32 bits of the Timestamp.
     */
    constructor(low: number, high: number);

    static MAX_VALUE: Timestamp;
    static MIN_VALUE: Timestamp;
    static NEG_ONE: Timestamp;
    static ONE: Timestamp;
    static ZERO: Timestamp;

    /**
     * Returns a Timestamp representing the 64-bit integer that comes by concatenating the
     * given high and low bits. Each is assumed to use 32 bits..
     *
     * @param lowBits The low 32-bits.
     * @param highBits The high 32-bits.
     */
    static fromBits(lowBits: number, highBits: number): Timestamp;

    /**
     * Returns a Timestamp representing the given (32-bit) integer value.
     *
     * @param value The 32-bit integer in question.
     */
    static fromInt(value: number): Timestamp;

    /**
     * Returns a Timestamp representing the given value, provided that it is a finite number. Otherwise, zero is returned.
     *
     * @param value The number in question.
     */
    static fromNumber(value: number): Timestamp;

    /**
     * Returns a Timestamp representation of the given string, written using the given radix.
     *
     * @param str The textual representation of the Timestamp.
     * @param radix The radix in which the text is written.
     */
    static fromString(str: string, radix?: number): Timestamp;

    /**
     * Returns the sum of this and the given Timestamp.
     *
     * @param other Timestamp to add to this one.
     */
    add(other: Timestamp): Timestamp;

    /**
     * Returns the bitwise-AND of this Timestamp and the given one.
     *
     * @param other Timestamp to add to this one.
     */
    and(other: Timestamp): Timestamp;

    /**
     * Compares this Timestamp with the given one.
     *
     * @param other Timestamp to compare against.
     */
    compare(other: Timestamp): number;

    /**
     * Returns this Timestamp divided by the given one.
     *
     * @param other Timestamp by which to divide.
     */
    div(other: Timestamp): Timestamp;

    /**
     * Return whether this Timestamp equals the other
     *
     * @param other
     */
    equals(other: Timestamp): boolean;

    /**
     * Return the high 32-bits value.
     */
    getHighBits(): number;

    /**
     * Return the low 32-bits value.
     */
    getLowBits(): number;

    /**
     * Return the low unsigned 32-bits value.
     */
    getLowBitsUnsigned(): number;

    /**
     * Returns the number of bits needed to represent the absolute value of this Timestamp.
     */
    getNumBitsAbs(): number;

    /**
     * Return whether this Timestamp is greater than the other.
     *
     * @param other Timestamp to compare against.
     */
    greaterThan(other: Timestamp): number;

    /**
     * Return whether this Timestamp is greater than or equal to the other.
     *
     * @param other Timestamp to compare against.
     */
    greaterThanOrEqual(other: Timestamp): number;

    /**
     * Return whether this value is negative.
     */
    isNegative(): boolean;

    /**
     * IsOdd.
     * Return whether this value is odd.
     */
    isOdd(): boolean;

    /**
     * Return whether this value is zero.
     */
    isZero(): boolean;

    /**
     * Return whether this Timestamp is less than the other.
     *
     * @param other Timestamp to compare against.
     */
    lessThan(other: Timestamp): boolean;

    /**
     * Return whether this Timestamp is less than or equal to the other.
     *
     * @param other Timestamp to compare against.
     */
    lessThanOrEqual(other: Timestamp): boolean;

    /**
     * Returns this Timestamp modulo the given one.
     *
     * @param other Timestamp by which to mod.
     */
    modulo(other: Timestamp): Timestamp;

    /**
     * Returns the product of this and the given Timestamp.
     *
     * @param other Timestamp to multiply with this.
     */
    multiply(other: Timestamp): Timestamp;

    /**
     * The negation of this value.
     */
    negate(): Timestamp;

    /**
     * The bitwise-NOT of this value.
     */
    not(): Timestamp;

    /**
     * Return whether this Timestamp does not equal the other.
     *
     * @param other Timestamp to compare against.
     */
    notEquals(other: Timestamp): boolean;

    /**
     * Returns the bitwise-OR of this Timestamp and the given one.
     *
     * @param other The Timestamp with which to OR.
     */
    or(other: Timestamp): Timestamp;

    /**
     * Returns this Timestamp with bits shifted to the left by the given amount.
     *
     * @param other The number of bits by which to shift.
     */
    shiftLeft(other: number): Timestamp;

    /**
     * Returns this Timestamp with bits shifted to the right by the given amount.
     *
     * @param other The number of bits by which to shift.
     */
    shiftRight(other: number): Timestamp;

    /**
     * Returns this Timestamp with bits shifted to the right by the given amount, with the new top bits matching the current sign bit.
     *
     * @param other
     */
    shiftRightUnsigned(other: number): Timestamp;

    /**
     * Returns the difference of this and the given Timestamp.
     *
     * @param other Timestamp to subtract from this.
     */
    subtract(other: Timestamp): Timestamp;

    /**
     * Return the int value.
     */
    toInt(): number;

    /**
     * Return the JSON value.
     */
    toJSON(): string;

    /**
     * Return the Number value.
     */
    toNumber(): number;

    /**
     * Return the String value.
     *
     * @param radix The radix in which the text should be written.
     */
    toString(radix?: number): string;

    /**
     * Returns the bitwise-XOR of this Timestamp and the given one.
     *
     * @param other The Timestamp with which to XOR.
     */
    xor(other: Timestamp): Timestamp;
}

export interface CollectionDeleteOneOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimmeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Allow driver to bypass schema validation in MongoDB 3.2 or higher.
     */
    bypassDocumentValidation?: boolean;
}

export interface CollectionDistinctOptions {

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;
}

/**
 * Create a new ObjectID instance.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html
 */
export interface Collection<T> {

    /**
     * Get the collection name.
     */
    collectionName: string;

    /**
     * Get the full collection namespace.
     */
    namespace: string;

    /**
     * The current write concern values.
     */
    writeConcern: WriteConcern;

    /**
     * The current read concern values.
     */
    readConcern: ReadConcern;

    /**
     * Get current index hint for collection.
     */
    hint: any;

    /**
     * Execute an aggregation framework pipeline against the collection, needs MongoDB >= 2.2
     *
     * @param pipeline Array containing all the aggregation framework commands for the execution.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#aggregate
     */
    aggregate(pipeline: Object[], callback: MongoCallback<any>): AggregationCursor<any>;

    /**
     * Execute an aggregation framework pipeline against the collection, needs MongoDB >= 2.2
     *
     * @param pipeline Array containing all the aggregation framework commands for the execution.
     * @param options Optional.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#aggregate
     */
    aggregate(pipeline: Object[], options?: CollectionAggregationOptions, callback?: MongoCallback<any>): AggregationCursor<any>;

    /**
     * Execute an aggregation framework pipeline against the collection, needs MongoDB >= 2.2
     *
     * @param pipeline Array containing all the aggregation framework commands for the execution.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#aggregate
     */
    aggregate<T>(pipeline: Object[], callback: MongoCallback<any>): AggregationCursor<T>;

    /**
     * Execute an aggregation framework pipeline against the collection, needs MongoDB >= 2.2
     *
     * @param pipeline Array containing all the aggregation framework commands for the execution.
     * @param options Optional.
     * @param callback Optional
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#aggregate
     */
    aggregate<T>(pipeline: Object[], options?: CollectionAggregationOptions, callback?: MongoCallback<any>): AggregationCursor<T>;

    /**
     * BulkWrite.
     *
     * @param operations Bulk operations to perform.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#bulkWrite
     */
    bulkWrite(operations: Object[], callback: MongoCallback<BulkWriteOpResultObject>): void;

    /**
     * BulkWrite.
     *
     * @param operations Bulk operations to perform.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#bulkWrite
     */
    bulkWrite(operations: Object[], options?: CollectionBulkWriteOptions): Promise<BulkWriteOpResultObject>;

    /**
     * BulkWrite.
     *
     * @param operations Bulk operations to perform.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#bulkWrite
     */
    bulkWrite(operations: Object[], options: CollectionBulkWriteOptions, callback: MongoCallback<BulkWriteOpResultObject>): void;

    /**
     * Count number of matching documents in the db to a query.
     *
     * @param query The query for the count.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#count
     */
    count(query: FilterQuery<T>, callback: MongoCallback<number>): void;

    /**
     * Count number of matching documents in the db to a query.
     *
     * @param query The query for the count.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#count
     */
    count(query: FilterQuery<T>, options?: MongoCountPreferences): Promise<number>;

    /**
     * Count number of matching documents in the db to a query.
     *
     * @param query The query for the count=
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#count
     */
    count(query: FilterQuery<T>, options: MongoCountPreferences, callback: MongoCallback<number>): void;

    /**
     * Count number of matching documents in the db to a query.
     *
     * @param query The query for the countDocuments.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#countDocumentst
     */
    countDocuments(query: FilterQuery<T>, callback: MongoCallback<number>): void;

    /**
     * Count number of matching documents in the db to a query.
     *
     * @param query The query for the count.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#countDocuments
     */
    countDocuments(query: FilterQuery<T>, options?: MongoCountPreferences): Promise<number>;

    /**
     * Count number of matching documents in the db to a query.
     *
     * @param query The query for the count=
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#countDocuments
     */
    countDocuments(query: FilterQuery<T>, options: MongoCountPreferences, callback: MongoCallback<number>): void;

    /**
     * Creates an index on the db and collection collection.
     *
     * @param fieldOrSpec Defines the index.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndex
     */
    createIndex(fieldOrSpec: string | any, callback: MongoCallback<string>): void;

    /**
     * Creates an index on the db and collection collection.
     *
     * @param fieldOrSpec Defines the index.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndex
     */
    createIndex(fieldOrSpec: string | any, options?: MongodbIndexOptions): Promise<string>;

    /**
     * Creates an index on the db and collection collection.
     *
     * @param fieldOrSpec Defines the index.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndex
     */
    createIndex(fieldOrSpec: string | any, options: MongodbIndexOptions, callback: MongoCallback<string>): void;

    /**
     * CreateIndexes.
     *
     * @param indexSpecs An array of index specifications to be created.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndexes and http://docs.mongodb.org/manual/reference/command/createIndexes/
     */
    createIndexes(indexSpecs: Object[]): Promise<any>;

    /**
     * CreateIndexes.
     *
     * @param indexSpecs An array of index specifications to be created.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#createIndexes and http://docs.mongodb.org/manual/reference/command/createIndexes/
     */
    createIndexes(indexSpecs: Object[], callback: MongoCallback<any>): void;

    /**
     * Delete multiple documents on MongoDB.
     *
     * @param filter The Filter used to select the documents to remove.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#deleteMany
     */
    deleteMany(filter: FilterQuery<T>, callback: MongoCallback<DeleteWriteOpResultObject>): void;

    /**
     * Delete multiple documents on MongoDB.
     *
     * @param filter The Filter used to select the documents to remove.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#deleteMany
     */
    deleteMany(filter: FilterQuery<T>, options?: CollectionOptions): Promise<DeleteWriteOpResultObject>;

    /**
     * Delete multiple documents on MongoDB.
     *
     * @param filter The Filter used to select the documents to remove.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#deleteMany
     */
    deleteMany(filter: FilterQuery<T>, options: CollectionOptions, callback: MongoCallback<DeleteWriteOpResultObject>): void;

    /**
     * Delete a document on MongoDB.
     *
     * @param filter The Filter used to select the document to remove.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#deleteOne
     */
    deleteOne(filter: FilterQuery<T>, callback: MongoCallback<DeleteWriteOpResultObject>): void;

    /**
     * Delete a document on MongoDB.
     *
     * @param filter The Filter used to select the document to remove.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#deleteOne
     */
    deleteOne(filter: FilterQuery<T>, options?: CollectionDeleteOneOptions): Promise<DeleteWriteOpResultObject>;

    /**
     * Delete a document on MongoDB.
     *
     * @param filter The Filter used to select the document to remove.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#deleteOne
     */
    deleteOne(filter: FilterQuery<T>, options: CollectionDeleteOneOptions, callback: MongoCallback<DeleteWriteOpResultObject>): void;

    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     *
     * @param key Field of the document to find distinct values for.
     * @param query The query for filtering the set of documents to which we apply the distinct filter.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#distinct
     */
    distinct(key: string, query: FilterQuery<T>, callback: MongoCallback<any>): void;

    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     *
     * @param key Field of the document to find distinct values for.
     * @param query The query for filtering the set of documents to which we apply the distinct filter.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#distinct
     */
    distinct(key: string, query: FilterQuery<T>, options?: CollectionDistinctOptions): Promise<any>;

    /**
     * The distinct command returns returns a list of distinct values for the given key across a collection.
     *
     * @param key Field of the document to find distinct values for.
     * @param query The query for filtering the set of documents to which we apply the distinct filter.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#distinct
     */
    distinct(key: string, query: FilterQuery<T>, options: CollectionDistinctOptions, callback: MongoCallback<any>): void;

    /**
     * Drop the collection from the database, removing it permanently. New accesses will create a new collection.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#drop
     */
    drop(): Promise<any>;

    /**
     * Drop the collection from the database, removing it permanently. New accesses will create a new collection.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#drop
     */
    drop(callback: MongoCallback<any>): void;

    /**
     * Drops an index from this collection.
     *
     * @param indexName Name of the index to drop.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#dropIndex
     */
    dropIndex(indexName: string, callback: MongoCallback<any>): void;

    /**
     * Drops an index from this collection.
     *
     * @param indexName Name of the index to drop.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#dropIndex
     */
    dropIndex(indexName: string, options?: CollectionOptions): Promise<any>;

    /**
     * Drops an index from this collection.
     *
     * @param indexName Name of the index to drop.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#dropIndex
     */
    dropIndex(indexName: string, options: CollectionOptions, callback: MongoCallback<any>): void;

    /**
     * Drops all indexes from this collection.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#dropIndexes
     */
    dropIndexes(): Promise<any>;

    /**
     * Drops all indexes from this collection.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#dropIndexes
     */
    dropIndexes(callback?: MongoCallback<any>): void;

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     *
     * @param query The cursor query object.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#find
     */
    find(query?: Object): Cursor<any>;

    /**
     * Creates a cursor for a query that can be used to iterate over results from MongoDB.
     *
     * @param query The cursor query object.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#find
     */
    find<T>(query?: FilterQuery<T>): Cursor<T>;

    /** @deprecated */
    find(query: FilterQuery<T>, fields?: Object, skip?: number, limit?: number, timeout?: number): Cursor<any>;

    /**
     * Fetches the first document that matches the query.
     *
     * @param query Query for find Operation.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOne
     * @deprecated use find().limit(1).next(function(err, doc){}).
     */
    findOne(query: FilterQuery<T>, callback: MongoCallback<any>): void;

    /**
     * Fetches the first document that matches the query.
     *
     * @param query Query for find Operation.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOne
     * @deprecated use find().limit(1).next(function(err, doc){}).
     */
    findOne(query: FilterQuery<T>, options?: MongodbFindOneOptions): Promise<any>;

    /**
     * Fetches the first document that matches the query.
     *
     * @param query Query for find Operation.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOne
     * @deprecated use find().limit(1).next(function(err, doc){}).
     */
    findOne(query: FilterQuery<T>, options: MongodbFindOneOptions, callback: MongoCallback<any>): void;

    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndDelete
     */
    findOneAndDelete(filter: FilterQuery<T>, callback: MongoCallback<FindAndModifyWriteOpResultObject>): void;

    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndDelete
     */
    findOneAndDelete(filter: FilterQuery<T>, options?: FindOneAndDeleteOptions): Promise<FindAndModifyWriteOpResultObject>;

    /**
     * Find a document and delete it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param options Optional settings.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndDelete
     */
    findOneAndDelete(filter: FilterQuery<T>, options: FindOneAndDeleteOptions, callback: MongoCallback<FindAndModifyWriteOpResultObject>): void;

    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param replacement Document replacing the matching document.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndReplace
     */
    findOneAndReplace(filter: FilterQuery<T>, replacement: Object, callback: MongoCallback<FindAndModifyWriteOpResultObject>): void;

    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param replacement Document replacing the matching document.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndReplace
     */
    findOneAndReplace(filter: FilterQuery<T>, replacement: Object, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject>;

    /**
     * Find a document and replace it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param replacement Document replacing the matching document.
     * @param options Optional settings.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndReplace
     */
    findOneAndReplace(filter: FilterQuery<T>, replacement: Object, options: FindOneAndReplaceOption, callback: MongoCallback<FindAndModifyWriteOpResultObject>): void;

    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param update Update operations to be performed on the document.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndUpdate
     */
    findOneAndUpdate(filter: FilterQuery<T>, update: UpdateQuery<T>, callback: MongoCallback<FindAndModifyWriteOpResultObject>): void;

    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param update Update operations to be performed on the document.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndUpdate
     */
    findOneAndUpdate(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject>;

    /**
     * Find a document and update it in one atomic operation, requires a write lock for the duration of the operation.
     *
     * @param filter Document selection filter.
     * @param update Update operations to be performed on the document.
     * @param options Optional settings.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndUpdate
     */
    findOneAndUpdate(filter: FilterQuery<T>, update: UpdateQuery<T>, options: FindOneAndReplaceOption, callback: MongoCallback<FindAndModifyWriteOpResultObject>): void;

    /**
     * Execute a geo search using a geo haystack index on a collection.
     *
     * @param x Point to search on the x axis, ensure the indexes are ordered in the same order.
     * @param y Point to search on the y axis, ensure the indexes are ordered in the same order.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#geoHaystackSearch
     */
    geoHaystackSearch(x: number, y: number, callback: MongoCallback<any>): void;

    /**
     * Execute a geo search using a geo haystack index on a collection.
     *
     * @param x Point to search on the x axis, ensure the indexes are ordered in the same order.
     * @param y Point to search on the y axis, ensure the indexes are ordered in the same order.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#geoHaystackSearch
     */
    geoHaystackSearch(x: number, y: number, options?: GeoHaystackSearchOptions): Promise<any>;

    /**
     * Execute a geo search using a geo haystack index on a collection.
     *
     * @param x Point to search on the x axis, ensure the indexes are ordered in the same order.
     * @param y Point to search on the y axis, ensure the indexes are ordered in the same order.
     * @param options Optional settings
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#geoHaystackSearch
     */
    geoHaystackSearch(x: number, y: number, options: GeoHaystackSearchOptions, callback: MongoCallback<any>): void;

    /**
     * Execute the geoNear command to search for items in the collection.
     *
     * @param x Point to search on the x axis, ensure the indexes are ordered in the same order.
     * @param y Point to search on the y axis, ensure the indexes are ordered in the same order.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#geoNear
     */
    geoNear(x: number, y: number, callback: MongoCallback<any>): void;

    /**
     * Execute the geoNear command to search for items in the collection.
     *
     * @param x Point to search on the x axis, ensure the indexes are ordered in the same order.
     * @param y Point to search on the y axis, ensure the indexes are ordered in the same order.
     * @param options Optionals.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#geoNear
     */
    geoNear(x: number, y: number, options?: GeoNearOptions): Promise<any>;

    /**
     * Execute the geoNear command to search for items in the collection.
     *
     * @param x Point to search on the x axis, ensure the indexes are ordered in the same order.
     * @param y Point to search on the y axis, ensure the indexes are ordered in the same order.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#geoNear
     */
    geoNear(x: number, y: number, options: GeoNearOptions, callback: MongoCallback<any>): void;

    /**
     * Run a group command across a collection.
     *
     * @param keys An object, array or function expressing the keys to group by.
     * @param condition An optional condition that must be true for a row to be considered.
     * @param initial Initial value of the aggregation counter object.
     * @param reduce The reduce function aggregates (reduces) the objects iterated.
     * @param finalize An optional function to be run on each item in the result set just before the item is returned.
     * @param command Specify if you wish to run using the internal group command or using eval, default is true.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#group
     */
    group(keys: Object | Array<any> | Function | Code, condition: Object, initial: Object, reduce: Function | Code, finalize: Function | Code, command: boolean, callback: MongoCallback<any>): void;

    /**
     * Run a group command across a collection.
     *
     * @param keys An object, array or function expressing the keys to group by.
     * @param condition An optional condition that must be true for a row to be considered.
     * @param initial Initial value of the aggregation counter object.
     * @param reduce The reduce function aggregates (reduces) the objects iterated.
     * @param finalize An optional function to be run on each item in the result set just before the item is returned.
     * @param command Specify if you wish to run using the internal group command or using eval, default is true.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#group
     */
    group(keys: Object | Array<any> | Function | Code, condition: Object, initial: Object, reduce: Function | Code, finalize: Function | Code, command: boolean, options?: GroupOptions): Promise<any>;

    /**
     * Run a group command across a collection.
     *
     * @param keys An object, array or function expressing the keys to group by.
     * @param condition An optional condition that must be true for a row to be considered.
     * @param initial Initial value of the aggregation counter object.
     * @param reduce The reduce function aggregates (reduces) the objects iterated.
     * @param finalize An optional function to be run on each item in the result set just before the item is returned.
     * @param command Specify if you wish to run using the internal group command or using eval, default is true.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#group
     */
    group(keys: Object | Array<any> | Function | Code, condition: Object, initial: Object, reduce: Function | Code, finalize: Function | Code, command: boolean, options: GroupOptions, callback: MongoCallback<any>): void;

    /**
     * Retrieve all the indexes on the collection.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#indexes
     */
    indexes(): Promise<any>;

    /**
     * Retrieve all the indexes on the collection.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#indexes
     */
    indexes(callback: MongoCallback<any>): void;

    /**
     * Checks if one or more indexes exist on the collection, fails on first non-existing index.
     *
     * @param indexes One or more index names to check.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#indexExists
     */
    indexExists(indexes: string | string[]): Promise<boolean>;

    /**
     * Checks if one or more indexes exist on the collection, fails on first non-existing index.
     *
     * @param indexes One or more index names to check.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#indexExists
     */
    indexExists(indexes: string | string[], callback: MongoCallback<boolean>): void;

    /**
     * Retrieves this collections index info.
     *
     * @param callback The command result callback
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#indexInformation
     */
    indexInformation(callback: MongoCallback<any>): void;

    /**
     * Retrieves this collections index info.
     *
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#indexInformation
     */
    indexInformation(options?: { full: boolean }): Promise<any>;

    /**
     * Retrieves this collections index info.
     *
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#indexInformation
     */
    indexInformation(options: { full: boolean }, callback: MongoCallback<any>): void;

    /**
     * Initiate an In order bulk write operation, operations will be serially executed in the order they are added,
     * creating a new operation for each switch in types.
     *
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#initializeOrderedBulkOp
     */
    initializeOrderedBulkOp(options?: CollectionOptions): OrderedBulkOperation;

    /**
     * Initiate a Out of order batch write operation. All operations will be buffered into insert/update/remove commands executed out of order.
     *
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#initializeUnorderedBulkOp
     */
    initializeUnorderedBulkOp(options?: CollectionOptions): UnorderedBulkOperation;

    // http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertOne
    /** @deprecated Use insertOne, insertMany or bulkWrite */
    insert(docs: Object, callback: MongoCallback<InsertOneWriteOpResult>): void;
    /** @deprecated Use insertOne, insertMany or bulkWrite */
    insert(docs: Object, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult>;
    /** @deprecated Use insertOne, insertMany or bulkWrite */
    insert(docs: Object, options: CollectionInsertOneOptions, callback: MongoCallback<InsertOneWriteOpResult>): void;

    /**
     * InsertMany.
     *
     * @param docs Documents to insert.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertMany
     */
    insertMany(docs: Object[], callback: MongoCallback<InsertWriteOpResult>): void;

    /**
     * InsertMany.
     *
     * @param docs Documents to insert.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertMany
     */
    insertMany(docs: Object[], options?: CollectionInsertManyOptions): Promise<InsertWriteOpResult>;

    /**
     * InsertMany.
     *
     * @param docs Documents to insert.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertMany
     */
    insertMany(docs: Object[], options: CollectionInsertManyOptions, callback: MongoCallback<InsertWriteOpResult>): void;

    /**
     * InsertOne.
     *
     * @param docs Document to insert.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertOne
     */
    insertOne(docs: Object, callback: MongoCallback<InsertOneWriteOpResult>): void;

    /**
     * InsertOne.
     *
     * @param docs Document to insert.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertOne
     */
    insertOne(docs: Object, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult>;

    /**
     * InsertOne.
     *
     * @param docs Document to insert.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertOne
     */
    insertOne(docs: Object, options: CollectionInsertOneOptions, callback: MongoCallback<InsertOneWriteOpResult>): void;

    /**
     * Returns if the collection is a capped collection.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#isCapped
     */
    isCapped(): Promise<any>;

    /**
     * Returns if the collection is a capped collection.
     *
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#isCapped
     */
    isCapped(callback: MongoCallback<any>): void;

    /**
     * Get the list of all indexes information for the collection.
     *
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#listIndexes
     */
    listIndexes(options?: ListIndexesOptions): CommandCursor;

    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     *
     * @param map The mapping function.
     * @param reduce The reduce function.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#mapReduce
     */
    mapReduce(map: Function | string, reduce: Function | string, callback: MongoCallback<any>): void;

    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     *
     * @param map The mapping function.
     * @param reduce The reduce function.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#mapReduce
     */
    mapReduce(map: Function | string, reduce: Function | string, options?: MapReduceOptions): Promise<any>;

    /**
     * Run Map Reduce across a collection. Be aware that the inline option for out will return an array of results not a collection.
     *
     * @param map The mapping function.
     * @param reduce The reduce function.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#mapReduce
     */
    mapReduce(map: Function | string, reduce: Function | string, options: MapReduceOptions, callback: MongoCallback<any>): void;

    /**
     * Returns the options of the collection.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#options
     */
    options(): Promise<any>;

    /**
     * Returns the options of the collection.
     *
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#options
     */
    options(callback: MongoCallback<any>): void;

    /**
     * Return N number of parallel cursors for a collection allowing parallel reading of entire collection. There are
     * no ordering guarantees for returned results.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#parallelCollectionScan
     */
    parallelCollectionScan(callback: MongoCallback<Cursor<any>[]>): void;

    /**
     * Return N number of parallel cursors for a collection allowing parallel reading of entire collection. There are
     * no ordering guarantees for returned results.
     *
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#parallelCollectionScan
     */
    parallelCollectionScan(options?: ParallelCollectionScanOptions): Promise<Cursor<any>[]>;

    /**
     * Return N number of parallel cursors for a collection allowing parallel reading of entire collection. There are
     * no ordering guarantees for returned results.
     *
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#parallelCollectionScan
     */
    parallelCollectionScan(options: ParallelCollectionScanOptions, callback: MongoCallback<Cursor<any>[]>): void;

    /**
     * Reindex all indexes on the collection.
     *
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#reIndex
     */
    reIndex(): Promise<any>;

    /**
     * Reindex all indexes on the collection.
     *
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#reIndex
     */
    reIndex(callback: MongoCallback<any>): void;

    // http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#remove
    /** @deprecated Use use deleteOne, deleteMany or bulkWrite */
    remove(selector: Object, callback: MongoCallback<WriteOpResult>): void;
    /** @deprecated Use use deleteOne, deleteMany or bulkWrite */
    remove(selector: Object, options?: CollectionOptions & { single?: boolean }): Promise<WriteOpResult>;
    /** @deprecated Use use deleteOne, deleteMany or bulkWrite */
    remove(selector: Object, options?: CollectionOptions & { single?: boolean }, callback?: MongoCallback<WriteOpResult>): void;

    /**
     * Rename the collection.
     *
     * @param newName New name of of the collection.
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#rename
     */
    rename(newName: string, callback: MongoCallback<Collection<T>>): void;

    /**
     * Rename the collection.
     *
     * @param newName New name of of the collection.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#rename
     */
    rename(newName: string, options?: { dropTarget?: boolean }): Promise<Collection<T>>;

    /**
     * Rename the collection.
     *
     * @param newName New name of of the collection.
     * @param options Optional settings.
     * @param callback The results callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#rename
     */
    rename(newName: string, options: { dropTarget?: boolean }, callback: MongoCallback<Collection<T>>): void;

    /**
     * Replace a document on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param doc The Document that replaces the matching document.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#replaceOne
     */
    replaceOne(filter: FilterQuery<T>, doc: Object, callback: MongoCallback<UpdateWriteOpResult>): void;

    /**
     * Replace a document on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param doc The Document that replaces the matching document.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#replaceOne
     */
    replaceOne(filter: FilterQuery<T>, doc: Object, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult>;

    /**
     * Replace a document on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param doc The Document that replaces the matching document.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#replaceOne
     */
    replaceOne(filter: FilterQuery<T>, doc: Object, options: ReplaceOneOptions, callback: MongoCallback<UpdateWriteOpResult>): void;

    // http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#save
    /** @deprecated Use insertOne, insertMany, updateOne or updateMany */
    save(doc: Object, callback: MongoCallback<WriteOpResult>): void;
    /** @deprecated Use insertOne, insertMany, updateOne or updateMany */
    save(doc: Object, options?: CollectionOptions): Promise<WriteOpResult>;
    /** @deprecated Use insertOne, insertMany, updateOne or updateMany */
    save(doc: Object, options: CollectionOptions, callback: MongoCallback<WriteOpResult>): void;

    /**
     * Get all the collection statistics.
     *
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#stats
     */
    stats(callback: MongoCallback<CollStats>): void;

    /**
     * Get all the collection statistics.
     *
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#stats
     */
    stats(options?: { scale: number }): Promise<CollStats>;

    /**
     * Get all the collection statistics.
     *
     * @param options Optional settings.
     * @param callback The collection result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#stats
     */
    stats(options: { scale: number }, callback: MongoCallback<CollStats>): void;

    // http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#update
    /** @deprecated use updateOne, updateMany or bulkWrite */
    update(filter: FilterQuery<T>, update: UpdateQuery<T>, callback: MongoCallback<WriteOpResult>): void;
    /** @deprecated use updateOne, updateMany or bulkWrite */
    update(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: ReplaceOneOptions & { multi?: boolean }): Promise<WriteOpResult>;
    /** @deprecated use updateOne, updateMany or bulkWrite */
    update(filter: FilterQuery<T>, update: UpdateQuery<T>, options: ReplaceOneOptions & { multi?: boolean }, callback: MongoCallback<WriteOpResult>): void;

    /**
     * Update multiple documents on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param update The update operations to be applied to the document.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#updateMany
     */
    updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>, callback: MongoCallback<UpdateWriteOpResult>): void;

    /**
     * Update multiple documents on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param update The update operations to be applied to the document.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#updateMany
     */
    updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: UpdateManyOptions): Promise<UpdateWriteOpResult>;

    /**
     * Update multiple documents on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param update The update operations to be applied to the document.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#updateMany
     */
    updateMany(filter: FilterQuery<T>, update: UpdateQuery<T>, options: UpdateManyOptions, callback: MongoCallback<UpdateWriteOpResult>): void;

    /**
     * Update a single document on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param update The update operations to be applied to the document.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#updateOne
     */
    updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, callback: MongoCallback<UpdateWriteOpResult>): void;

    /**
     * Update a single document on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param update The update operations to be applied to the document.
     * @param options Optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#updateOne
     */
    updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: ReplaceOneOptions): Promise<UpdateWriteOpResult>;

    /**
     * Update a single document on MongoDB.
     *
     * @param filter The Filter used to select the document to update.
     * @param update The update operations to be applied to the document.
     * @param options Optional settings.
     * @param callback The command result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#updateOne
     */
    updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options: ReplaceOneOptions, callback: MongoCallback<UpdateWriteOpResult>): void;

    /**
     * Create a new Change Stream, watching for new changes (insertions, updates, replacements, deletions, and invalidations) in this collection.
     * @param pipeline An array of aggregation pipeline stages through which to pass change stream documents. This allows for filtering (using $match) and manipulating the change stream documents.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#watch
     */
    watch(pipeline?: Object[], options?: ChangeStreamOptions & { startAtClusterTime?: Timestamp, session?: ClientSession }): ChangeStream;

}

/**
 * Condition.
 */
export type Condition<T, P extends keyof T> = {
    $eq?: T[P];
    $gt?: T[P];
    $gte?: T[P];
    $in?: T[P][];
    $lt?: T[P];
    $lte?: T[P];
    $ne?: T[P];
    $nin?: T[P][];
    $and?: (FilterQuery<T[P]> | T[P])[];
    $or?: (FilterQuery<T[P]> | T[P])[];
    $not?: (FilterQuery<T[P]> | T[P])[] | T[P];
    $expr?: any;
    $jsonSchema?: any;
    $mod?: [number, number];
    $regex?: RegExp;
    $options?: string;
    $text?: {
        $search: string;
        $language?: string;
        $caseSensitive?: boolean;
        $diacraticSensitive?: boolean;
    };
    $where?: Object;
    $geoIntersects?: Object;
    $geoWithin?: Object;
    $near?: Object;
    $nearSphere?: Object;
    $elemMatch?: Object;
    $size?: number;
    $bitsAllClear?: Object;
    $bitsAllSet?: Object;
    $bitsAnyClear?: Object;
    $bitsAnySet?: Object;
    [key: string]: any;
};

/**
 * @see https://docs.mongodb.com/manual/reference/operator/update
 */
export type UpdateQuery<T> = {
    $inc?: { [P in keyof T]?: number } | { [key: string]: number };
    $min?: { [P in keyof T]?: number } | { [key: string]: number };
    $max?: { [P in keyof T]?: number } | { [key: string]: number };
    $mul?: { [P in keyof T]?: number } | { [key: string]: number };
    $set?: Partial<T> | { [key: string]: any };
    $setOnInsert?: Partial<T> | { [key: string]: any };
    $unset?: { [P in keyof T]?: "" } | { [key: string]: "" };
    $rename?: { [key: string]: keyof T } | { [key: string]: string };
    $currentDate?: { [P in keyof T]?: (true | { $type: "date" | "timestamp" }) } | { [key: string]: (true | { $type: "date" | "timestamp" }) };
    $addToSet?: Partial<T> | { [key: string]: any };
    $pop?: { [P in keyof T]?: -1 | 1 } | { [key: string]: -1 | 1 };
    $pull?: Partial<T> | { [key: string]: Condition<T, keyof T> };
    $push?: Partial<T> | { [key: string]: any };
    $pushAll?: Partial<T> | { [key: string]: Array<any> };
    $each?: Partial<T> | { [key: string]: Array<any> };
    $bit?: { [P in keyof T]?: any } | { [key: string]: any };
};

export type FilterQuery<T> = {
    [P in keyof T]?: T[P] | Condition<T, P>;
} | { [key: string]: any };

/**
 * The name of the target collection.
 *
 * @see http://docs.mongodb.org/manual/reference/command/collStats/
 */
export interface CollStats {

    /**
     * Namespace.
     */
    ns: string;

    /**
     * The number of objects or documents in this collection.
     */
    count: number;

    /**
     * Collection size in bytes.
     */
    size: number;

    /**
     * Average object size in bytes.
     */
    avgObjSize: number;

    /**
     * (Pre)allocated space for the collection in bytes.
     */
    storageSize: number;

    /**
     * Number of extents (contiguously allocated chunks of datafile space).
     */
    numExtents: number;

    /**
     * Number of indexes.
     */
    nindexes: number;

    /**
     * Size of the most recently created extent in bytes.
     */
    lastExtentSize: number;

    /**
     * Padding can speed up updates if documents grow.
     */
    paddingFactor: number;

    /**
     * A number that indicates the user-set flags on the collection. userFlags
     * only appears when using the mmapv1 storage engine.
     */
    userFlags: number;

    /**
     * Total index size in bytes.
     */
    totalIndexSize: number;

    /**
     * Size of specific indexes in bytes.
     */
    indexSizes: {
        _id_: number;
        username: number;
    };

    /**
     * This field will be “true” if the collection is capped.
     */
    capped: boolean;

    /**
     * Shows the maximum size of a capped collection.
     */
    maxSize: boolean;

    /**
     * This document contains data reported directly by the WiredTiger engine and other data for internal diagnostic use.
     */
    wiredTiger: any;

    /**
     * A document that reports data from the WiredTiger storage engine for each index in the collection.
     * Other storage engines will return an empty document.
     */
    indexDetails: any;

    /**
     *
     */
    ok: number;
}

/**
 * CollectionAggregationOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#aggregate
 */
export interface CollectionAggregationOptions {

    readPreference?: ReadPreference | string;

    /**
     * Return the query as cursor, on 2.6 > it returns as a real cursor on pre 2.6 it returns as an emulated cursor.
     */
    cursor?: { batchSize: number };

    /**
     * Explain returns the aggregation execution plan (requires mongodb 2.6 >).
     */
    explain?: boolean;

    /**
     * allowDiskUse lets the server know if it can use disk to store temporary results for the aggregation (requires mongodb 2.6 >).
     */
    allowDiskUse?: boolean;

    /**
     * maxTimeMS specifies a cumulative time limit in milliseconds for processing operations on the cursor. MongoDB interrupts the operation at the earliest following interrupt point.
     */
    maxTimeMS?: boolean;

    /**
     * Allow driver to bypass schema validation in MongoDB 3.2 or higher.
     */
    bypassDocumentValidation?: boolean;
}

/**
 * CollectionInsertManyOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertMany
 */
export interface CollectionInsertManyOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Serialize functions on any object.
     */
    serializeFunctions?: boolean;

    /**
     * Force server to assign _id values instead of driver.
     */
    forceServerObjectId?: boolean;
}

export interface UpdateManyOptions {

    /**
     * Update operation is an upsert.
     */
    upsert?: boolean;

    /**
     * The write concern.
     */
    w?: any;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;
}

/**
 * CollectionBulkWriteOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#bulkWrite
 */
export interface CollectionBulkWriteOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Serialize functions on any object.
     */
    serializeFunctions?: boolean;

    /**
     * Execute write operation in ordered or unordered fashion.
     */
    ordered?: boolean;

    /**
     * Allow driver to bypass schema validation in MongoDB 3.2 or higher.
     */
    bypassDocumentValidation?: boolean;
}

/**
 * BulkWriteOpResultObject.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#~BulkWriteOpResult
 */
export interface BulkWriteOpResultObject {

    /**
     * Number of documents inserted.
     */
    insertedCount?: number;

    /**
     * Number of documents matched for update.
     */
    matchedCount?: number;

    /**
     * Number of documents modified.
     */
    modifiedCount?: number;

    /**
     * Number of documents deleted.
     */
    deletedCount?: number;

    /**
     * Number of documents upserted.
     */
    upsertedCount?: number;

    /**
     * Inserted document generated Id's, hash key is the index of the originating operation.
     */
    insertedIds?: any;

    /**
     * Upserted document generated Id's, hash key is the index of the originating operation.
     */
    upsertedIds?: any;

    /**
     * The command result object.
     */
    result?: any;
}

/**
 * MongoCountPreferences.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#count
 */
export interface MongoCountPreferences {

    /**
     * The limit of documents to count.
     */
    limit?: number;

    /**
     * The number of documents to skip for the count.
     */
    skip?: boolean;

    /**
     * An index name hint for the query.
     */
    hint?: string;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;
}

/**
 * DeleteWriteOpResultObject.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#~deleteWriteOpResult
 */
export interface DeleteWriteOpResultObject {

    /**
     * The raw result returned from MongoDB, field will vary depending on server version.
     * @param ok Is 1 if the command executed correctly.
     * @param n The total count of documents deleted.
     */
    result: {
        ok?: number;
        n?: number;
    };

    /**
     * The connection object used for the operation.
     */
    connection?: any;

    /**
     * The number of documents deleted.
     */
    deletedCount?: number;
}

/**
 * FindAndModifyWriteOpResultObject.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#~findAndModifyWriteOpResult
 */
export interface FindAndModifyWriteOpResultObject {

    /**
     * Document returned from findAndModify command.
     */
    value?: any;

    /**
     * The raw lastErrorObject returned from the command.
     */
    lastErrorObject?: any;

    /**
     * Is 1 if the command executed correctly.
     */
    ok?: number;
}

/**
 * FindOneAndReplaceOption.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOneAndReplace
 */
export interface FindOneAndReplaceOption {

    /**
     * Limits the fields to return for all matching documents.
     */
    projection?: Object;

    /**
     * Determines which document the operation modifies if the query selects multiple documents.
     */
    sort?: Object;

    /**
     * The maximum amount of time to allow the query to run.
     */
    maxTimeMS?: number;

    /**
     * Upsert the document if it does not exist.
     */
    upsert?: boolean;

    /**
     * When false, returns the updated document rather than the original. The default is true.
     */
    returnOriginal?: boolean;
}

/**
 * GeoHaystackSearchOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#geoHaystackSearch
 */
export interface GeoHaystackSearchOptions {

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * Include results up to maxDistance from the point.
     */
    maxDistance?: number;

    /**
     * Filter the results by a query.
     */
    search?: Object;

    /**
     * Max number of results to return.
     */
    limit?: number;
}

/**
 * GeoNearOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#geoNear
 */
export interface GeoNearOptions {

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * Max number of results to return.
     */
    num?: number;

    /**
     * Include results starting at minDistance from a point (2.6 or higher).
     */
    minDistance?: number;

    /**
     * Include results up to maxDistance from the point.
     */
    maxDistance?: number;

    /**
     * Include a value to multiply the distances with allowing for range conversions.
     */
    distanceMultiplier?: number;

    /**
     * Filter the results by a query.
     */
    query?: Object;

    /**
     * Perform query using a spherical model.
     */
    spherical?: boolean;

    /**
     * The closest location in a document to the center of the search region will always be returned MongoDB > 2.X.
     */
    uniqueDocs?: boolean;

    /**
     * Include the location data fields in the top level of the results MongoDB > 2.X.
     */
    includeLocs?: boolean;
}

/**
 * A class representation of the BSON Code type.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Code.html
 */
export declare class Code {
    /**
     *
     * @param code a string or function.
     * @param scope optional
     */
    constructor(code: string | Function, scope?: Object)

    /**
     * A string or function.
     */
    code: string | Function;

    /**
     * An optional scope for the function.
     */
    scope: any;
}

/**
 * CollectionOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#deleteMany
 */
export interface CollectionOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;
}

/**
 * Create a new OrderedBulkOperation instance (INTERNAL TYPE, do not instantiate directly).
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/OrderedBulkOperation.html
 */
export interface OrderedBulkOperation {
    /**
     * Get the number of operations in the bulk.
     */
    length: number;

    /**
     * Execute the ordered bulk operation.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/OrderedBulkOperation.html#execute
     */
    execute(callback: MongoCallback<BulkWriteResult>): void;

    /**
     * Execute the ordered bulk operation.
     * @param options optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/OrderedBulkOperation.html#execute
     */
    execute(options?: FSyncOptions): Promise<BulkWriteResult>;

    /**
     * Execute the ordered bulk operation.
     * @param options Optional settings.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/OrderedBulkOperation.html#execute
     */
    execute(options: FSyncOptions, callback: MongoCallback<BulkWriteResult>): void;

    /**
     * Initiate a find operation for an update/updateOne/remove/removeOne/replaceOne.
     * @param selector The selector for the bulk operation.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/OrderedBulkOperation.html#find
     */
    find(selector: Object): FindOperatorsOrdered;

    /**
     * Add a single insert document to the bulk operation.
     * @param doc The document to insert
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/OrderedBulkOperation.html#insert
     */
    insert(doc: Object): OrderedBulkOperation;
}

/**
 * BulkWriteResult.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/BulkWriteResult.html
 */
export interface BulkWriteResult {

    /**
     * Did bulk operation correctly execute.
     */
    ok: number;

    /**
     * number of inserted documents.
     */
    nInserted: number;

    /**
     * number of documents updated logically.
     */
    nUpdated: number;

    /**
     * Number of upserted documents.
     */
    nUpserted: number;

    /**
     *
     Number of documents updated physically on disk.
     */
    nModified: number;

    /**
     * Number of removed documents.
     */
    nRemoved: number;

    /**
     * Return an array of inserted ids.
     */
    getInsertedIds(): Array<Object>;

    /**
     * Retrieve lastOp if available.
     */
    getLastOp(): Object;

    /**
     * Return raw internal result.
     */
    getRawResponse(): Object;

    /**
     * Return the upserted id at position x.
     */
    getUpsertedIdAt(index: number): Object;

    /**
     * Return an array of upserted ids.
     */
    getUpsertedIds(): Array<Object>;

    /**
     * Retrieve the write concern error if any.
     */
    getWriteConcernError(): WriteConcernError;

    /**
     * Returns a specific write error object.
     */
    getWriteErrorAt(index: number): WriteError;

    /**
     * Returns the number of write errors off the bulk operation.
     */
    getWriteErrorCount(): number;

    /**
     * Retrieve all write errors.
     */
    getWriteErrors(): Array<Object>;

    /**
     * Returns true if the bulk operation contains a write error.
     */
    hasWriteErrors(): boolean;
}

/**
 * Create a new WriteError instance (INTERNAL TYPE, do not instantiate directly).
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/WriteError.html
 */
export interface WriteError {

    /**
     * Write concern error code.
     */
    code: number;

    /**
     * Write concern error original bulk operation index.
     */
    index: number;

    /**
     * Write concern error message.
     */
    errmsg: string;
}

/**
 * Create a new WriteConcernError instance (INTERNAL TYPE, do not instantiate directly).
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/WriteConcernError.html
 */
export interface WriteConcernError {

    /**
     * Write concern error code.
     */
    code: number;

    /**
     * Write concern error message.
     */
    errmsg: string;
}

/**
 * Create a FindOperatorsOrdered instance (INTERNAL TYPE, do not instantiate directly).
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/FindOperatorsOrdered.html
 */
export interface FindOperatorsOrdered {

    /**
     * Add a remove operation to the bulk operation.
     */
    delete(): OrderedBulkOperation;

    /**
     * Add a remove one operation to the bulk operation.
     */
    deleteOne(): OrderedBulkOperation;

    /**
     * Add a replace one operation to the bulk operation.
     */
    replaceOne(doc: Object): OrderedBulkOperation;

    /**
     * Add a single update document to the bulk operation.
     */
    update(doc: Object): OrderedBulkOperation;

    /**
     * Add a single update one document to the bulk operation.
     */
    updateOne(doc: Object): OrderedBulkOperation;

    /**
     * Upsert modifier for update bulk operation.
     */
    upsert(): FindOperatorsOrdered;
}

/**
 * Create a new UnorderedBulkOperation instance (INTERNAL TYPE, do not instantiate directly).
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/UnorderedBulkOperation.html
 */
export interface UnorderedBulkOperation {

    /**
     * Get the number of operations in the bulk.
     */
    length: number;

    /**
     * Execute the ordered bulk operation.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/UnorderedBulkOperation.html#execute
     */
    execute(callback: MongoCallback<BulkWriteResult>): void;

    /**
     * Execute the ordered bulk operation.
     * @param options optional.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/UnorderedBulkOperation.html#execute
     */
    execute(options?: FSyncOptions): Promise<BulkWriteResult>;

    /**
     * Execute the ordered bulk operation.
     * @param options Optional settings.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/UnorderedBulkOperation.html#execute
     */
    execute(options: FSyncOptions, callback: MongoCallback<BulkWriteResult>): void;

    /**
     * Initiate a find operation for an update/updateOne/remove/removeOne/replaceOne.
     * @param selector The selector for the bulk operation.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/UnorderedBulkOperation.html#find
     */
    find(selector: Object): FindOperatorsUnordered;

    /**
     * Add a single insert document to the bulk operation.
     * @param doc The document to insert.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/UnorderedBulkOperation.html#insert
     */
    insert(doc: Object): UnorderedBulkOperation;
}

/**
 * Create a FindOperatorsUnordered instance (INTERNAL TYPE, do not instantiate directly).
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/FindOperatorsUnordered.html
 */
export interface FindOperatorsUnordered {

    /**
     * Get the number of operations in the bulk.
     */
    length: number;

    /**
     * Add a remove operation to the bulk operation.
     */
    remove(): UnorderedBulkOperation;

    /**
     * Add a remove one operation to the bulk operation.
     */
    removeOne(): UnorderedBulkOperation;

    /**
     * Add a replace one operation to the bulk operation.
     * @param doc The new document to replace the existing one with.
     */
    replaceOne(doc: Object): UnorderedBulkOperation;

    /**
     * Add a single update document to the bulk operation.
     * @param doc Update operations
     */
    update(doc: Object): UnorderedBulkOperation;

    /**
     * Add a single update one document to the bulk operation.
     * @param doc Update operations
     */
    updateOne(doc: Object): UnorderedBulkOperation;

    /**
     * Upsert modifier for update bulk operation.
     */
    upsert(): FindOperatorsUnordered;
}

/**
 * MongodbFindOneOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#findOne
 */
export interface MongodbFindOneOptions {

    /**
     * Sets the limit of documents returned in the query.
     */
    limit?: number;

    /**
     * Set to sort the documents coming back from the query. Array of indexes, [['a', 1]] etc.
     */
    sort?: Array<any> | Object;

    /**
     * The fields to return in the query. Object of fields to include or exclude (not both), {'a':1}.
     */
    fields?: Object;

    /**
     * Set to skip N documents ahead in your query (useful for pagination).
     */
    skip?: number;

    /**
     * Tell the query to use specific indexes in the query. Object of indexes to use, {'_id':1}.
     */
    hint?: Object;

    /**
     * Explain the query instead of returning the data.
     */
    explain?: boolean;

    /**
     * Snapshot query.
     */
    snapshot?: boolean;

    /**
     * Specify if the cursor can timeout.
     */
    timeout?: boolean;

    /**
     * Specify if the cursor is tailable.
     */
    tailable?: boolean;

    /**
     * Set the batchSize for the getMoreCommand when iterating over the query results.
     */
    batchSize?: number;

    /**
     * Only return the index key.
     */
    returnKey?: boolean;

    /**
     * Limit the number of items to scan.
     */
    maxScan?: number;

    /**
     * Set index bounds.
     */
    min?: number;

    /**
     * Set index bounds.
     */
    max?: number;

    /**
     * Show disk location of results.
     */
    showDiskLoc?: boolean;

    /**
     * You can put a $comment field on a query to make looking in the profiler logs simpler.
     */
    comment?: string;

    /**
     * Return document results as raw BSON buffers.
     */
    raw?: boolean;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * Specify if the cursor should return partial results when querying against a sharded system.
     */
    partial?: boolean;

    /**
     * Number of milliseconds to wait before aborting the query.
     */
    maxTimeMs?: number;
}

/**
 * InsertWriteOpResult.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#~insertWriteOpResult
 */
export interface InsertWriteOpResult {

    /**
     * The total amount of documents inserted.
     */
    insertedCount: number;

    /**
     * All the documents inserted using insertOne/insertMany/replaceOne.
     * Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany.
     */
    ops: Array<any>;

    /**
     * All the generated _id's for the inserted documents.
     */
    insertedIds: Array<ObjectID>;

    /**
     * The connection object used for the operation.
     */
    connection: any;

    /**
     * The raw command result object returned from MongoDB (content might vary by server version).
     * @param ok Is 1 if the command executed correctly.
     * @param n The total count of documents inserted.
     */
    result: { ok: number, n: number };
}

/**
 * CollectionInsertOneOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#insertOne
 */
export interface CollectionInsertOneOptions {

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Serialize functions on any object.
     */
    serializeFunctions?: boolean;

    /**
     * Force server to assign _id values instead of driver.
     */
    forceServerObjectId?: boolean;

    /**
     * Allow driver to bypass schema validation in MongoDB 3.2 or higher.
     */
    bypassDocumentValidation?: boolean;
}

/**
 * InsertOneWriteOpResult.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#~insertOneWriteOpResult
 */
export interface InsertOneWriteOpResult {

    /**
     * The total amount of documents inserted.
     */
    insertedCount: number;

    /**
     * All the documents inserted using insertOne/insertMany/replaceOne.
     * Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany.
     */
    ops: Array<any>;

    /**
     * The driver generated ObjectId for the insert operation.
     */
    insertedId: ObjectID;

    /**
     * The connection object used for the operation.
     */
    connection: any;

    /**
     * The raw command result object returned from MongoDB (content might vary by server version).
     * @param ok Is 1 if the command executed correctly.
     * @param n The total count of documents inserted.
     */
    result: { ok: number, n: number };
}

/**
 * ParallelCollectionScanOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#parallelCollectionScan
 */
export interface ParallelCollectionScanOptions {

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * Set the batchSize for the getMoreCommand when iterating over the query results.
     */
    batchSize?: number;

    /**
     * The maximum number of parallel command cursors to return (the number of returned cursors will be in the range 1:numCursors).
     */
    numCursors?: number;

    /**
     * Return all BSON documents as Raw Buffer documents.
     */
    raw?: boolean;
}

/**
 * ParallelCollectionScanOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#replaceOne
 */
export interface ReplaceOneOptions {

    /**
     * Update operation is an upsert.
     */
    upsert?: boolean;

    /**
     * The write concern.
     */
    w?: number | string;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * Specify a journal write concern.
     */
    j?: boolean;

    /**
     * Allow driver to bypass schema validation in MongoDB 3.2 or higher.
     */
    bypassDocumentValidation?: boolean;
}

/**
 * ParallelCollectionScanOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#~updateWriteOpResult
 */
export interface UpdateWriteOpResult {

    /**
     * The raw result returned from MongoDB, field will vary depending on server version.
     * @param ok Is 1 if the command executed correctly.
     * @param n The total count of documents scanned.
     * @param nModified The total count of documents modified.
     */
    result: { ok: number, n: number, nModified: number };

    /**
     * The connection object used for the operation.
     */
    connection: any;

    /**
     * The number of documents that matched the filter.
     */
    matchedCount: number;

    /**
     * The number of documents that were modified.
     */
    modifiedCount: number;

    /**
     * The number of documents upserted.
     */
    upsertedCount: number;

    /**
     * The upserted id.
     * @param _id The upserted _id returned from the server.
     */
    upsertedId: { _id: ObjectID };
}

/**
 * ParallelCollectionScanOptions.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#mapReduce
 */
export interface MapReduceOptions {

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;

    /**
     * Sets the output target for the map reduce job.
     * {inline:1} | {replace:'collectionName'} | {merge:'collectionName'} | {reduce:'collectionName'}.
     */
    out?: Object;

    /**
     * Query filter object.
     */
    query?: Object;

    /**
     * Sorts the input objects using this key. Useful for optimization, like sorting by the emit key for fewer reduces.
     */
    sort?: Object;

    /**
     * Number of objects to return from collection.
     */
    limit?: number;

    /**
     * Keep temporary data.
     */
    keeptemp?: boolean;

    /**
     * Finalize function.
     */
    finalize?: Function | string;

    /**
     * Can pass in variables that can be access from map/reduce/finalize.
     */
    scope?: Object;

    /**
     * It is possible to make the execution stay in JS. Provided in MongoDB > 2.0.X.
     */
    jsMode?: boolean;

    /**
     * Provide statistics on job execution time.
     */
    verbose?: boolean;

    /**
     * Allow driver to bypass schema validation in MongoDB 3.2 or higher.
     */
    bypassDocumentValidation?: boolean;
}

/**
 * WriteOpResult.
 *
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#~WriteOpResult
 */
export interface WriteOpResult {

    /**
     * All the documents inserted using insertOne/insertMany/replaceOne.
     * Documents contain the _id field if forceServerObjectId == false for insertOne/insertMany.
     */
    ops: Array<any>;

    /**
     * The connection object used for the operation.
     */
    connection: any;

    /**
     * The command result object.
     */
    result: any;
}

/**
 * WriteOpResult.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#~resultCallback
 */
export type CursorResult = any | void | boolean;

/**
 * Creates a new Cursor instance (INTERNAL TYPE, do not instantiate directly).
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html
 */
export declare class Cursor<T> extends Readable {

    /**
     * Cursor query sort setting.
     */
    sortValue: string;

    /**
     * Is Cursor able to time out.
     */
    timeout: boolean;

    /**
     * Get cursor ReadPreference.
     */
    readPreference: ReadPreference;

    /**
     * @param flag The flag to set, must be one of following ['tailable', 'oplogReplay', 'noCursorTimeout', 'awaitData', 'partial'].
     * @param value The flag boolean value.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#addCursorFlag
     */
    addCursorFlag(flag: string, value: boolean): Cursor<T>;

    /**
     * @param name The query modifier (must start with $, such as $orderby etc).
     * @param value The flag boolean value.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#addQueryModifier
     */
    addQueryModifier(name: string, value: boolean): Cursor<T>;

    /**
     * @param value The batchSize for the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#batchSize
     */
    batchSize(value: number): Cursor<T>;

    /**
     * Clone the cursor.
     * still returns the same type.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#clone
     */
    clone(): Cursor<T>;

    /**
     * Close the cursor, sending a KillCursor command and emitting close.
     * The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#close
     */
    close(): Promise<CursorResult>;

    /**
     * Close the cursor, sending a KillCursor command and emitting close.
     * The result callback.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#close
     */
    close(callback: MongoCallback<CursorResult>): void;

    /**
     * Add a comment to the cursor query allowing for tracking the comment in the log.
     * @param value The comment attached to this query.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#comment
     */
    comment(value: string): Cursor<T>;

    /**
     * Get the count of documents for this cursor.
     * @param applySkipLimit Should the count command apply limit and skip settings on the cursor or in the passed in options.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#count
     */
    count(applySkipLimit: boolean, callback: MongoCallback<number>): void;

    /**
     * Get the count of documents for this cursor.
     * @param applySkipLimit Should the count command apply limit and skip settings on the cursor or in the passed in options.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#count
     */
    count(applySkipLimit: boolean, options?: CursorCommentOptions): Promise<number>;

    /**
     * Get the count of documents for this cursor.
     * @param applySkipLimit Should the count command apply limit and skip settings on the cursor or in the passed in options.
     * @param options Optional settings.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#count
     */
    count(applySkipLimit: boolean, options: CursorCommentOptions, callback: MongoCallback<number>): void;

    /**
     * Execute the explain for the cursor.
     * returns Promise if no callback passed.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#explain
     */
    explain(): Promise<CursorResult>;

    /**
     * Execute the explain for the cursor.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#explain
     */
    explain(callback: MongoCallback<CursorResult>): void;

    /**
     * Set the cursor query.
     * @param filter The filter object used for the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#filter
     */
    filter(filter: Object): Cursor<T>;

    /**
     * Iterates over all the documents for this cursor using the iterator, callback pattern.
     * @param iterator The iteration callback.
     * @param callback The end callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/Cursor.html#forEach
     */
    forEach(iterator: IteratorCallback<T>, callback: EndCallback): void;
    forEach(iterator: IteratorCallback<T>): Promise<void>;

    /**
     * Check if there is any document still available in the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#hasNext
     */
    hasNext(): Promise<boolean>;

    /**
     * Check if there is any document still available in the cursor.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#hasNext
     */
    hasNext(callback: MongoCallback<boolean>): void;

    /**
     * Set the cursor hint.
     * @param hint If specified, then the query system will only consider plans using the hinted index.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#hint
     */
    hint(hint: Object): Cursor<T>;

    /**
     * Is the cursor closed.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#isClosed
     */
    isClosed(): boolean;

    /**
     * Set the limit for the cursor.
     * @param value The limit for the cursor query.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#limit
     */
    limit(value: number): Cursor<T>;

    /**
     * SMap all documents using the provided function.
     * @param transform The mapping transformation method.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#map
     */
    map(transform: Function): Cursor<T>;

    /**
     * Set the cursor max.
     * @param max Specify a $max value to specify the exclusive upper bound for a specific index in
     * order to constrain the results of find(). The $max specifies the upper bound for
     * all keys of a specific index in order.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#max
     */
    max(max: number): Cursor<T>;

    /**
     * Set a maxAwaitTimeMS on a tailing cursor query to allow to customize the
     * timeout value for the option awaitData (Only supported on MongoDB 3.2 or higher, ignored otherwise).
     * @param value Number of milliseconds to wait before aborting the tailed query.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#maxAwaitTimeMS
     */
    maxAwaitTimeMS(value: number): Cursor<T>;

    /**
     * Set the cursor maxScan.
     * @param maxScan Constrains the query to only scan the specified number of documents when fulfilling the query.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#maxScan
     */
    maxScan(maxScan: Object): Cursor<T>;

    /**
     * Set a maxTimeMS on the cursor query, allowing for hard timeout limits on queries (Only supported on MongoDB 2.6 or higher).
     * @param value Number of milliseconds to wait before aborting the query.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#maxTimeMS
     */
    maxTimeMS(value: number): Cursor<T>;

    /**
     * Set the cursor min.
     * @param min Specify a $min value to specify the inclusive lower bound for a specific index in order to
     * constrain the results of find(). The $min specifies the lower bound for all keys of a specific index in order.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#min
     */
    min(min: number): Cursor<T>;

    /**
     * Get the next available document from the cursor, returns null if no more documents are available.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#next
     */
    next(): Promise<CursorResult>;

    /**
     * Get the next available document from the cursor, returns null if no more documents are available.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#next
     */
    next(callback: MongoCallback<CursorResult>): void;

    /**
     * Sets a field projection for the query.
     * @param value The field projection object.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#project
     */
    project(value: Object): Cursor<T>;

    /**
     * The read() method pulls some data out of the internal buffer and returns it.
     * If there is no data available, then it will return null.
     * @param size Optional argument to specify how much data to read.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#read
     */
    read(size: number): string | Buffer | void;

    /**
     * Set the cursor returnKey.
     * @param returnKey Only return the index field or fields for the results of the query. If $returnKey is set
     * to true and the query does not use an index to perform the read operation,
     * the returned documents will not contain any fields. Use one of the following forms:
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#next
     */
    returnKey(returnKey: Object): Cursor<T>;

    /**
     * Resets the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#rewind
     */
    rewind(): void;

    /**
     * Set a node.js specific cursor option.
     * @param field The cursor option to set ['numberOfRetries', 'tailableRetryInterval'].
     * @param value The field value.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#setCursorOption
     */
    setCursorOption(field: string, value: Object): Cursor<T>;

    /**
     * Set the ReadPreference for the cursor.
     * @param readPreference The new read preference for the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#setReadPreference
     */
    setReadPreference(readPreference: string | ReadPreference): Cursor<T>;

    /**
     * Set the cursor showRecordId.
     * @param showRecordId The $showDiskLoc option has now been deprecated and replaced with the
     * showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#showRecordId
     */
    showRecordId(showRecordId: Object): Cursor<T>;

    /**
     * Set the skip for the cursor.
     * @param value The skip for the cursor query.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#skip
     */
    skip(value: number): Cursor<T>;

    /**
     * Set the cursor snapshot.
     * @param snapshot The $snapshot operator prevents the cursor from returning a document more than
     * once because an intervening write operation results in a move of the document.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#snapshot
     */
    snapshot(snapshot: Object): Cursor<T>;

    /**
     * Sets the sort order of the cursor query.
     * @param keyOrList The key or keys set for the sort.
     * @param direction The direction of the sorting (1 or -1).
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#sort
     */
    sort(keyOrList: string | Object[] | Object, direction?: number): Cursor<T>;

    /**
     * Return a modified Readable stream including a possible transform method.
     * @param options Optional settings.
     * @param transform A transformation method applied to each document emitted by the stream.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#stream
     */
    stream(options?: { transform?: Function }): Cursor<T>;

    /**
     * Returns an array of documents. The caller is responsible for making sure that there is enough
     * memory to store the results. Note that the array only contain partial results when this cursor had
     * been previously accessed. In that case, cursor.rewind() can be used to reset the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#toArray
     */
    toArray(): Promise<T[]>;

    /**
     * Returns an array of documents. The caller is responsible for making sure that there is enough
     * memory to store the results. Note that the array only contain partial results when this cursor had
     * been previously accessed. In that case, cursor.rewind() can be used to reset the cursor.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#toArray
     */
    toArray(callback: MongoCallback<T[]>): void;

    /**
     * This is useful in certain cases where a stream is being consumed by a parser, which needs to "un-consume" some
     * data that it has optimistically pulled out of the source, so that the stream can be passed on to some other party.
     * @param stream Chunk of data to unshift onto the read queue.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#unshift
     */
    unshift(stream: Buffer | string): void;
}

/**
 * Get the count of documents for this cursor.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#count
 */
export interface CursorCommentOptions {

    /**
     * The number of documents to skip.
     */
    skip?: number;

    /**
     * The maximum amounts to count before aborting.
     */
    limit?: number;

    /**
     * Number of miliseconds to wait before aborting the query.
     */
    maxTimeMS?: number;

    /**
     * An index name hint for the query.
     */
    hint?: string;

    /**
     * The preferred read preference (ReadPreference.PRIMARY, ReadPreference.PRIMARY_PREFERRED,
     * ReadPreference.SECONDARY, ReadPreference.SECONDARY_PREFERRED, ReadPreference.NEAREST).
     */
    readPreference?: ReadPreference | string;
}

/**
 * Creates a new Change Stream instance.
 * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html
 */
export declare class ChangeStream extends Readable {

    constructor(changeDomain: MongoClient | Db | Collection<any>, pipeline: Object[], options?: ChangeStreamOptions);

    /**
     * Close the Change Stream.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html#close
     */
    close(): Promise<any>;

    /**
     * Close the Change Stream.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html#close
     */
    close(callback: MongoCallback<any>): void;

    /**
     * Check if there is any document still available in the Change Stream.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html#hasNext
     */
    hasNext(): Promise<any>;

    /**
     * Check if there is any document still available in the Change Stream.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html#hasNext
     */
    hasNext(callback: MongoCallback<any>): void;

    /**
     * Is the cursor closed.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html#isClosed
     */
    isClosed(): boolean;

    /**
     * Get the next available document from the Change Stream, returns null if no more documents are available.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html#next
     */
    next(): Promise<any>;

    /**
     * Get the next available document from the Change Stream, returns null if no more documents are available.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html#next
     */
    next(callback: MongoCallback<any>): void;

    /**
     * Return a modified Readable stream including a possible transform method.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ChangeStream.html#stream
     */
    stream(options?: { transform: Function }): Cursor<any>;
}

/**
 * ChangeStreamOptions
 */
export interface ChangeStreamOptions {

    /**
     * Allowed values: ‘default’, ‘updateLookup’.
     * When set to ‘updateLookup’, the change stream will include both a delta describing the changes to the document,
     * as well as a copy of the entire document that was changed from some time after the change occurred.
     */
    fullDocument?: string;

    /**
     * The maximum amount of time for the server to wait on new documents to satisfy a change stream query
     */
    maxAwaitTimeMS?: number;

    /**
     * Specifies the logical starting point for the new change stream.
     * This should be the _id field from a previously returned change stream document.
     */
    resumeAfter?: Object;

    /**
     * The number of documents to return per batch.
     */
    batchSize?: number;

    /**
     * Specify collation settings for operation.
     */
    collation?: CollationDocument;

    /**
     * The read preference. Defaults to the read preference of the database or collection.
     */
    readPreference?: ReadPreference;
}

/**
 * CollationDocument
 */
export interface CollationDocument {
    locale: string;
    strength?: number;
    caseLevel?: boolean;
    caseFirst?: string;
    numericOrdering?: boolean;
    alternate?: string;
    maxVariable?: string;
    backwards?: boolean;
    normalization?: boolean;

}

/**
 * A class representing a client session on the server.
 * WARNING: not meant to be instantiated directly.
 * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html
 */
export interface ClientSession extends EventEmitter {

    /**
     * The server id associated with this session
     */
    id: any;

    /**
     * Aborts the currently active transaction in this session.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#abortTransaction
     */
    abortTransaction(): Promise<void>;

    /**
     * Aborts the currently active transaction in this session.
     * @param callback Optional callback for completion of this operation
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#abortTransaction
     */
    abortTransaction(callback?: MongoCallback<void>): Promise<void>;

    /**
     * Advances the operationTime for a ClientSession.
     * @param operationTime the BSON.Timestamp of the operation type it is desired to advance to.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#advanceOperationTime
     */
    advanceOperationTime(operationTime: Timestamp): void;

    /**
     * Commits the currently active transaction in this session.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#commitTransaction
     */
    commitTransaction(): Promise<void>;

    /**
     * Commits the currently active transaction in this session.
     * @param callback Optional callback for completion of this operation.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#commitTransaction
     */
    commitTransaction(callback?: MongoCallback<void>): Promise<void>;

    /**
     * Ends this session on the server.
     * @param callback Optional callback for completion of this operation.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#endSession
     */
    endSession(callback?: MongoCallback<void>): void;

    /**
     * Ends this session on the server.
     * @param options Optional settings. Currently reserved for future use.
     * @param callback Optional callback for completion of this operation.
     * @see @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#endSession
     */
    endSession(options?: any, callback?: MongoCallback<void>): void;

    /**
     * Used to determine if this session equals another.
     * @param session A class representing a client session on the server.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#equals
     */
    equals(session: ClientSession): boolean;

    /**
     * Increment the transaction number on the internal ServerSession.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#incrementTransactionNumber
     */
    incrementTransactionNumber(): void;

    /**
     * Check this session is currently in a transaction or not.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#inTransaction
     */
    inTransaction(): boolean;

    /**
     * Starts a new transaction with the given options.
     * @param options Optional settings.
     * @see http://mongodb.github.io/node-mongodb-native/3.1/api/ClientSession.html#startTransaction
     */
    startTransaction(options?: TransactionOptions): void;

}

/**
 * Options to pass when creating a Client Session
 * @see http://mongodb.github.io/node-mongodb-native/3.1/api/global.html#SessionOptions
 */
export interface SessionOptions {

    /**
     * Whether causal consistency should be enabled on this session
     */
    causalConsistency?: boolean;

    /**
     * The default TransactionOptions to use for transactions started on this session.
     */
    defaultTransactionOptions?: TransactionOptions;
}

/**
 * TransactionOptions
 */
export interface TransactionOptions {

    readConcern?: ReadConcern;
    writeConcern?: WriteConcern;
    readPreference?: ReadPreference;
}

/**
 * MongoClientCommonOption
 */
export interface MongoClientCommonOption {
    /**
     * Do not make the db an event listener to the original connection.
     */
    noListener?: boolean;

    /**
     * Control if you want to return a cached instance or have a new one created
     */
    returnNonCachedInstance?: boolean;
}

/**
 * @see http://mongodb.github.io/node-mongodb-native/3.1/api/global.html#ReadConcern
 */
export type ReadConcernLevel = "local" | "available" | "majority" | "linearizable" | "snapshot";

/**
 * The MongoDB ReadConcern, which allows for control of the consistency and isolation properties
 * of the data read from replica sets and replica set shards.
 * @see http://mongodb.github.io/node-mongodb-native/3.1/api/global.html#ReadConcern
 */
export interface ReadConcern {
    level?: ReadConcernLevel;
}

/**
 * A MongoDB WriteConcern, which describes the level of acknowledgement
 * requested from MongoDB for write operations.
 * @see http://mongodb.github.io/node-mongodb-native/3.1/api/global.html#WriteConcern
 */
export interface WriteConcern {

    /**
     * requests acknowledgement that the write operation has
     * propagated to a specified number of mongod hosts
     */
    w?: number | "majority" | string;

    /**
     * requests acknowledgement from MongoDB that the write operation has
     * been written to the journal
     */
    j?: boolean;

    /**
     * a time limit, in milliseconds, for the write concern
     */
    wtimeout?: number;
}

/**
 * The callback format for the forEach iterator method.
 * @param doc An emitted document for the iterator.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#~iteratorCallback
 */
export interface IteratorCallback<T> {
    (doc: T): void;
}

/**
 * The callback error format for the forEach iterator method.
 * @param error An error instance representing the error during the execution.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#~endCallback
 */
export interface EndCallback {
    (error: MongoError): void;
}

/**
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#~resultCallback
 */
export type AggregationCursorResult = any | void;

/**
 * Creates a new Aggregation Cursor instance (INTERNAL TYPE, do not instantiate directly),
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html
 */
export interface AggregationCursor<T> extends Readable {

    /**
     * Set the batch size for the cursor.
     * @param value The batchSize for the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#batchSize
     */
    batchSize(value: number): AggregationCursor<T>;

    /**
     * Clone the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#clone
     */
    clone(): AggregationCursor<T>;

    /**
     * Close the cursor, sending a AggregationCursor command and emitting close.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#close
     */
    close(): Promise<AggregationCursorResult>;

    /**
     * Close the cursor, sending a AggregationCursor command and emitting close.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#close
     */
    close(callback: MongoCallback<AggregationCursorResult>): void;

    /**
     * Iterates over all the documents for this cursor. As with {cursor.toArray}, not all of the elements will
     * be iterated if this cursor had been previouly accessed. In that case, {cursor.rewind} can be used to reset
     * the cursor. However, unlike {cursor.toArray}, the cursor will only hold a maximum of batch size elements
     * at any given time if batch size is specified. Otherwise, the caller is responsible for making sure
     * that the entire result can fit the memory.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#each
     */
    each(callback: MongoCallback<AggregationCursorResult>): void;

    /**
     * Execute the explain for the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#explain
     */
    explain(): Promise<AggregationCursorResult>;

    /**
     * Execute the explain for the cursor.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#explain
     */
    explain(callback: MongoCallback<AggregationCursorResult>): void;

    /**
     * Add a geoNear stage to the aggregation pipeline.
     * @param document The geoNear stage document.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#geoNear
     */
    geoNear(document: Object): AggregationCursor<T>;

    /**
     * Add a group stage to the aggregation pipeline.
     * @param document The group stage document.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#group
     */
    group(document: Object): AggregationCursor<T>;

    /**
     * Is the cursor closed.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#isClosed
     */
    isClosed(): boolean;

    /**
     * Add a limit stage to the aggregation pipeline.
     * @param value The state limit value.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#limit
     */
    limit(value: number): AggregationCursor<T>;

    /**
     * Add a match stage to the aggregation pipeline.
     * @param document The match stage document.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#match
     */
    match(document: Object): AggregationCursor<T>;

    /**
     * Add a maxTimeMS stage to the aggregation pipeline.
     * @param value The state maxTimeMS value.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#maxTimeMS
     */
    maxTimeMS(value: number): AggregationCursor<T>;

    /**
     * Get the next available document from the cursor, returns null if no more documents are available.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#next
     */
    next(): Promise<AggregationCursorResult>;

    /**
     * Get the next available document from the cursor, returns null if no more documents are available.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#next
     */
    next(callback: MongoCallback<AggregationCursorResult>): void;

    /**
     * Add a out stage to the aggregation pipeline.
     * @param destination The destination name.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#out
     */
    out(destination: string): AggregationCursor<T>;

    /**
     * Add a project stage to the aggregation pipeline.
     * @param document The project stage document.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#project
     */
    project(document: Object): AggregationCursor<T>;

    /**
     * The read() method pulls some data out of the internal buffer and returns it.
     * If there is no data available, then it will return null.
     * @param size Optional argument to specify how much data to read.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#read
     */
    read(size: number): string | Buffer | void;

    /**
     * Add a redact stage to the aggregation pipeline.
     * @param document The redact stage document.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#redact
     */
    redact(document: Object): AggregationCursor<T>;

    /**
     * Resets the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#rewind
     */
    rewind(): AggregationCursor<T>;

    /**
     * Add a skip stage to the aggregation pipeline.
     * @param value The state skip value.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#setEncoding
     */
    skip(value: number): AggregationCursor<T>;

    /**
     * Add a sort stage to the aggregation pipeline.
     * @param document The sort stage document.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#sort
     */
    sort(document: Object): AggregationCursor<T>;

    /**
     * Returns an array of documents. The caller is responsible for making sure that there
     * is enough memory to store the results. Note that the array only contain partial
     * results when this cursor had been previouly accessed. In that case,
     * cursor.rewind() can be used to reset the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#toArray
     */
    toArray(): Promise<T[]>;

    /**
     * Returns an array of documents. The caller is responsible for making sure that there
     * is enough memory to store the results. Note that the array only contain partial
     * results when this cursor had been previouly accessed. In that case,
     * cursor.rewind() can be used to reset the cursor.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#toArray
     */
    toArray(callback: MongoCallback<T[]>): void;

    /**
     * This is useful in certain cases where a stream is being consumed by a parser,
     * which needs to "un-consume" some data that it has optimistically pulled out of the source,
     * so that the stream can be passed on to some other party.
     * @param stream Chunk of data to unshift onto the read queue.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#unshift
     */
    unshift(stream: Buffer | string): void;

    /**
     * Add a unwind stage to the aggregation pipeline.
     * @param field The unwind field name.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/AggregationCursor.html#unwind
     */
    unwind(field: string): AggregationCursor<T>;
}

/**
 * CommandCursor.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html
 */
export interface CommandCursor extends Readable {

    /**
     * Set the batch size for the cursor.
     * @param value The batchSize for the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#batchSize
     */
    batchSize(value: number): CommandCursor;

    /**
     * Clone the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#clone
     */
    clone(): CommandCursor;

    /**
     * Close the cursor, sending a KillCursor command and emitting close.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#close
     */
    close(): Promise<AggregationCursorResult>;

    /**
     * Close the cursor, sending a KillCursor command and emitting close.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#close
     */
    close(callback: MongoCallback<AggregationCursorResult>): void;

    /**
     * Each
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#each
     */
    each(callback: MongoCallback<AggregationCursorResult>): void;

    /**
     * Is the cursor closed.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#isClosed
     */
    isClosed(): boolean;

    /**
     * Add a maxTimeMS stage to the aggregation pipeline.
     * @param value The state maxTimeMS value.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#maxTimeMS
     */
    maxTimeMS(value: number): CommandCursor;

    /**
     * Get the next available document from the cursor, returns null if no more documents are available.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#next
     */
    next(): Promise<AggregationCursorResult>;

    /**
     * Get the next available document from the cursor, returns null if no more documents are available.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#next
     */
    next(callback: MongoCallback<AggregationCursorResult>): void;

    /**
     * The read() method pulls some data out of the internal buffer and returns it.
     * If there is no data available, then it will return null.
     * @param size Optional argument to specify how much data to read.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#read
     */
    read(size: number): string | Buffer | void;

    /**
     * Resets the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#rewind
     */
    rewind(): CommandCursor;

    /**
     * Set the ReadPreference for the cursor.
     * @param readPreference The new read preference for the cursor.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#setReadPreference
     */
    setReadPreference(readPreference: string | ReadPreference): CommandCursor;

    /**
     * Returns an array of documents. The caller is responsible for making sure that there is enough memory
     * to store the results. Note that the array only contain partial results when this cursor had been previouly accessed.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#toArray
     */
    toArray(): Promise<any[]>;

    /**
     * Returns an array of documents. The caller is responsible for making sure that there is enough memory
     * to store the results. Note that the array only contain partial results when this cursor had been previouly accessed.
     * @param callback The result callback.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#toArray
     */
    toArray(callback: MongoCallback<any[]>): void;

    /**
     * This is useful in certain cases where a stream is being consumed by a parser,
     * which needs to "un-consume" some data that it has optimistically pulled out of the source,
     * so that the stream can be passed on to some other party.
     * @param stream Chunk of data to unshift onto the read queue.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/CommandCursor.html#unshift
     */
    unshift(stream: Buffer | string): void;
}

/**
 * GridFSBucket.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html
 */
export declare class GridFSBucket {

    /**
     *
     * @param db A db handle.
     * @param options Optional settings.
     */
    constructor(db: Db, options?: GridFSBucketOptions);

    /**
     * Deletes a file with the given id.
     * @param id The id of the file doc
     * @param callback The result callback
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#delete
     */
    delete(id: ObjectID, callback?: GridFSBucketErrorCallback): void;

    /**
     * Removes this bucket's files collection, followed by its chunks collection.
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#drop
     */
    drop(callback?: GridFSBucketErrorCallback): void;

    /**
     * Convenience wrapper around find on the files collection
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#find
     */
    find(filter?: Object, options?: GridFSBucketFindOptions): Cursor<any>;

    /**
     * Returns a readable stream (GridFSBucketReadStream) for streaming file.
     * @param id The id of the file doc.
     * @param options Optional settings
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#openDownloadStream
     */
    openDownloadStream(id: ObjectID, options?: { start: number, end: number }): GridFSBucketReadStream;

    /**
     * Returns a readable stream (GridFSBucketReadStream) for streaming file
     * @param filename The id of the file doc
     * @param options Optional settings
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#openDownloadStreamByName
     */

    openDownloadStreamByName(filename: string, options?: { revision: number, start: number, end: number }): GridFSBucketReadStream;

    /**
     * Returns a writable stream (GridFSBucketWriteStream) for writing buffers to GridFS.
     * The stream's 'id' property contains the resulting file's id.
     * @param filename The value of the 'filename' key in the files doc.
     * @param options Optional settings
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#openUploadStream
     */
    openUploadStream(filename: string, options?: GridFSBucketOpenUploadStreamOptions): GridFSBucketWriteStream;

    /**
     * Returns a writable stream (GridFSBucketWriteStream) for writing buffers to GridFS for a custom file id.
     * The stream's 'id' property contains the resulting file's id.
     * @param id A custom id used to identify the file.
     * @param filename The value of the 'filename' key in the files doc.
     * @param options Optional settings
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#openUploadStreamWithId
     */
    openUploadStreamWithId(id: string | number | Object, filename: string, options?: GridFSBucketOpenUploadStreamOptions): GridFSBucketWriteStream;

    /**
     * Renames the file with the given _id to the given string.
     * @param id the id of the file to rename.
     * @param filename new name for the file.
     * @param callback The result callback
     * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#rename
     */
    rename(id: ObjectID, filename: string, callback?: GridFSBucketErrorCallback): void;
}

/**
 * Constructor for a streaming GridFS interface.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html
 */
export interface GridFSBucketOptions {

    /**
     * The 'files' and 'chunks' collections will be prefixed with the bucket name followed by a dot.
     */
    bucketName?: string;

    /**
     * Number of bytes stored in each chunk. Defaults to 255KB.
     */
    chunkSizeBytes?: number;

    /**
     * Optional write concern to be passed to write operations, for instance { w: 1 }.
     */
    writeConcern?: WriteConcern;

    /**
     * Optional read preference to be passed to read operations.
     */
    ReadPreference?: ReadPreference;
}

/**
 * GridFSBucketErrorCallback.
 * @param err An error instance representing any errors that occurred.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#~errorCallback
 */
export interface GridFSBucketErrorCallback {
    (err?: MongoError): void;
}

/**
 * GridFSBucketFindOptions.
 * @see http://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#find
 */
export interface GridFSBucketFindOptions {

    /**
     * Optional batch size for cursor.
     */
    batchSize?: number;

    /**
     * Optional limit for cursor.
     */
    limit?: number;

    /**
     * Optional maxTimeMS for cursor.
     */
    maxTimeMS?: number;

    /**
     * Optionally set cursor's noCursorTimeout flag.
     */
    noCursorTimeout?: boolean;

    /**
     * Optional skip for cursor.
     */
    skip?: number;

    /**
     * Optional sort for cursor.
     */
    sort?: Object;
}

/**
 * GridFSBucketOpenUploadStreamOptions.
 * @see https://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucket.html#openUploadStream
 */
export interface GridFSBucketOpenUploadStreamOptions {

    /**
     * Optional overwrite this bucket's chunkSizeBytes for this file.
     */
    chunkSizeBytes?: number;

    /**
     * Optional object to store in the file document's metadata field.
     */
    metadata?: Object;

    /**
     * Optional string to store in the file document's contentType field.
     */
    contentType?: string;

    /**
     * Optional array of strings to store in the file document's aliases field.
     */
    aliases?: Array<string>;
}

/**
 * GridFSBucketReadStream.
 * @see https://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucketReadStream.html
 */
export declare class GridFSBucketReadStream extends Readable {

    /**
     *
     * @param chunks Handle for chunks collection.
     * @param files Handle for files collection.
     * @param readPreference The read preference to use.
     * @param filter The query to use to find the file document.
     * @param options Optional settings.
     */
    constructor(chunks: Collection<any>, files: Collection<any>, readPreference: Object, filter: Object, options?: GridFSBucketReadStreamOptions);
}

/**
 * GridFSBucketReadStreamOptions.
 * @see https://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucketReadStream.html
 */
export interface GridFSBucketReadStreamOptions {

    /**
     * Optional sort for the file find query.
     */
    sort?: number;

    /**
     * Optional skip for the file find query.
     */
    skip?: number;

    /**
     * Optional 0-based offset in bytes to start streaming from.
     */
    start?: number;

    /**
     * Optional 0-based offset in bytes to stop streaming before.
     */
    end?: number;
}

/**
 * GridFSBucketWriteStream
 * @see https://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucketWriteStream.html
 */
export declare class GridFSBucketWriteStream extends Writable {

    /**
     *
     * @param bucket Handle for this stream's corresponding bucket.
     * @param filename The value of the 'filename' key in the files doc.
     * @param options Optional settings.
     */
    constructor(bucket: GridFSBucket, filename: string, options?: GridFSBucketWriteStreamOptions);
}

/**
 * GridFSBucketWriteStreamOptions.
 * @see https://mongodb.github.io/node-mongodb-native/2.1/api/GridFSBucketWriteStream.html
 */
export interface GridFSBucketWriteStreamOptions {

    /**
     * Custom file id for the GridFS file.
     */
    id?: string | number | Object;

    /**
     * The chunk size to use, in bytes.
     */
    chunkSizeBytes?: number;

    /**
     * The write concern.
     */
    w?: number;

    /**
     * The write concern timeout.
     */
    wtimeout?: number;

    /**
     * The journal write concern.
     */
    j?: number;
}
