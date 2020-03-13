import {Driver} from "../Driver";
import {ConnectionIsNotSetError} from "../../error/ConnectionIsNotSetError";
import {ObjectLiteral} from "../../common/ObjectLiteral";
import {DriverPackageNotInstalledError} from "../../error/DriverPackageNotInstalledError";
import {DriverUtils} from "../DriverUtils";
import {ColumnMetadata} from "../../metadata/ColumnMetadata";
import {CockroachConnectionCredentialsOptions} from "./CockroachConnectionCredentialsOptions";
import {CockroachConnectionOptions} from "./CockroachConnectionOptions";
import {DateUtils} from "../../util/DateUtils";
import {PlatformTools} from "../../platform/PlatformTools";
import {Connection} from "../../connection/Connection";
import {RdbmsSchemaBuilder} from "../../schema-builder/RdbmsSchemaBuilder";
import {MappedColumnTypes} from "../types/MappedColumnTypes";
import {ColumnType} from "../types/ColumnTypes";
import {QueryRunner} from "../../query-runner/QueryRunner";
import {DataTypeDefaults} from "../types/DataTypeDefaults";
import {TableColumn} from "../../schema-builder/table/TableColumn";
import {EntityMetadata} from "../../metadata/EntityMetadata";
import {OrmUtils} from "../../util/OrmUtils";
import {CockroachQueryRunner} from "./CockroachQueryRunner";
import {ApplyValueTransformers} from "../../util/ApplyValueTransformers";

/**
 * Organizes communication with Cockroach DBMS.
 */
export class CockroachDriver implements Driver {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used by driver.
     */
    connection: Connection;

    /**
     * Cockroach underlying library.
     */
    postgres: any;

    /**
     * Pool for master database.
     */
    master: any;

    /**
     * Pool for slave databases.
     * Used in replication.
     */
    slaves: any[] = [];

    /**
     * We store all created query runners because we need to release them.
     */
    connectedQueryRunners: QueryRunner[] = [];

    // -------------------------------------------------------------------------
    // Public Implemented Properties
    // -------------------------------------------------------------------------

    /**
     * Connection options.
     */
    options: CockroachConnectionOptions;

    /**
     * Master database used to perform all write queries.
     */
    database?: string;

    /**
     * Indicates if replication is enabled.
     */
    isReplicated: boolean = false;

    /**
     * Indicates if tree tables are supported by this driver.
     */
    treeSupport = true;

    /**
     * Gets list of supported column data types by a driver.
     *
     * @see https://www.cockroachlabs.com/docs/stable/data-types.html
     */
    supportedDataTypes: ColumnType[] = [
        "array",
        "bool",
        "boolean",
        "bytes",
        "bytea",
        "blob",
        "date",
        "numeric",
        "decimal",
        "dec",
        "float",
        "float4",
        "float8",
        "double precision",
        "real",
        "inet",
        "int",
        "int4",
        "integer",
        "int2",
        "int8",
        "int64",
        "smallint",
        "bigint",
        "interval",
        "string",
        "character varying",
        "character",
        "char",
        "char varying",
        "varchar",
        "text",
        "time",
        "time without time zone",
        "timestamp",
        "timestamptz",
        "timestamp without time zone",
        "timestamp with time zone",
        "json",
        "jsonb",
        "uuid",
    ];

    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[] = [];

    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[] = [
        "character varying",
        "char varying",
        "varchar",
        "character",
        "char",
        "string",
    ];

    /**
     * Gets list of column data types that support precision by a driver.
     */
    withPrecisionColumnTypes: ColumnType[] = [
        "numeric",
        "decimal",
        "dec",
    ];

    /**
     * Gets list of column data types that support scale by a driver.
     */
    withScaleColumnTypes: ColumnType[] = [
        "numeric",
        "decimal",
        "dec"
    ];

    /**
     * Orm has special columns and we need to know what database column types should be for those types.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes = {
        createDate: "timestamptz",
        createDateDefault: "now()",
        updateDate: "timestamptz",
        updateDateDefault: "now()",
        deleteDate: "timestamptz",
        deleteDateNullable: true,
        version: "int4",
        treeLevel: "int4",
        migrationId: "int4",
        migrationName: "varchar",
        migrationTimestamp: "int8",
        cacheId: "int4",
        cacheIdentifier: "varchar",
        cacheTime: "int8",
        cacheDuration: "int4",
        cacheQuery: "string",
        cacheResult: "string",
        metadataType: "varchar",
        metadataDatabase: "varchar",
        metadataSchema: "varchar",
        metadataTable: "varchar",
        metadataName: "varchar",
        metadataValue: "string",
    };

    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults = {
        "char": { length: 1 },
    };

    /**
     * No documentation specifying a maximum length for identifiers could be found
     * for CockroarchDb.
     */
    maxAliasLength?: number;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection) {
        this.connection = connection;
        this.options = connection.options as CockroachConnectionOptions;
        this.isReplicated = this.options.replication ? true : false;

        // load postgres package
        this.loadDependencies();

        // ObjectUtils.assign(this.options, DriverUtils.buildDriverOptions(connection.options)); // todo: do it better way
        // validate options to make sure everything is set
        // todo: revisit validation with replication in mind
        // if (!this.options.host)
        //     throw new DriverOptionNotSetError("host");
        // if (!this.options.username)
        //     throw new DriverOptionNotSetError("username");
        // if (!this.options.database)
        //     throw new DriverOptionNotSetError("database");
    }

    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------

    /**
     * Performs connection to the database.
     * Based on pooling options, it can either create connection immediately,
     * either create a pool and create connection when needed.
     */
    async connect(): Promise<void> {

        if (this.options.replication) {
            this.slaves = await Promise.all(this.options.replication.slaves.map(slave => {
                return this.createPool(this.options, slave);
            }));
            this.master = await this.createPool(this.options, this.options.replication.master);
            this.database = this.options.replication.master.database;

        } else {
            this.master = await this.createPool(this.options, this.options);
            this.database = this.options.database;
        }
    }

    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    async afterConnect(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Closes connection with database.
     */
    async disconnect(): Promise<void> {
        if (!this.master)
            return Promise.reject(new ConnectionIsNotSetError("cockroachdb"));

        await this.closePool(this.master);
        await Promise.all(this.slaves.map(slave => this.closePool(slave)));
        this.master = undefined;
        this.slaves = [];
    }

    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder() {
        return new RdbmsSchemaBuilder(this.connection);
    }

    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: "master"|"slave" = "master") {
        return new CockroachQueryRunner(this, mode);
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, columnMetadata: ColumnMetadata): any {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformTo(columnMetadata.transformer, value);

        if (value === null || value === undefined)
            return value;

        if (columnMetadata.type === Boolean) {
            return value === true ? 1 : 0;

        } else if (columnMetadata.type === "date") {
            return DateUtils.mixedDateToDateString(value);

        } else if (columnMetadata.type === "time") {
            return DateUtils.mixedDateToTimeString(value);

        } else if (columnMetadata.type === "datetime"
            || columnMetadata.type === Date
            || columnMetadata.type === "timestamp"
            || columnMetadata.type === "timestamptz"
            || columnMetadata.type === "timestamp with time zone"
            || columnMetadata.type === "timestamp without time zone") {
            return DateUtils.mixedDateToDate(value);

        } else if (["json", "jsonb", ...this.spatialTypes].indexOf(columnMetadata.type) >= 0) {
            return JSON.stringify(value);

        } else if (columnMetadata.type === "simple-array") {
            return DateUtils.simpleArrayToString(value);

        } else if (columnMetadata.type === "simple-json") {
            return DateUtils.simpleJsonToString(value);

        }

        return value;
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    prepareHydratedValue(value: any, columnMetadata: ColumnMetadata): any {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;

        // unique_rowid() generates bigint value and should not be converted to number
        /*if ((columnMetadata.type === Number && !columnMetadata.isArray) || columnMetadata.generationStrategy === "increment") {
            value = parseInt(value);

        } else */if (columnMetadata.type === Boolean) {
            value = value ? true : false;

        } else if (columnMetadata.type === "datetime"
            || columnMetadata.type === Date
            || columnMetadata.type === "timestamp"
            || columnMetadata.type === "timestamptz"
            || columnMetadata.type === "timestamp with time zone"
            || columnMetadata.type === "timestamp without time zone") {
            value = DateUtils.normalizeHydratedDate(value);

        } else if (columnMetadata.type === "date") {
            value = DateUtils.mixedDateToDateString(value);

        } else if (columnMetadata.type === "time") {
            value = DateUtils.mixedTimeToString(value);

        } else if (columnMetadata.type === "simple-array") {
            value = DateUtils.stringToSimpleArray(value);

        } else if (columnMetadata.type === "simple-json") {
            value = DateUtils.stringToSimpleJson(value);

        }

        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);

        return value;
    }

    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql: string, parameters: ObjectLiteral, nativeParameters: ObjectLiteral): [string, any[]] {
        const builtParameters: any[] = Object.keys(nativeParameters).map(key => nativeParameters[key]);
        if (!parameters || !Object.keys(parameters).length)
            return [sql, builtParameters];

        const keys = Object.keys(parameters).map(parameter => "(:(\\.\\.\\.)?" + parameter + "\\b)").join("|");
        sql = sql.replace(new RegExp(keys, "g"), (key: string): string => {
            let value: any;
            let isArray = false;
            if (key.substr(0, 4) === ":...") {
                isArray = true;
                value = parameters[key.substr(4)];
            } else {
                value = parameters[key.substr(1)];
            }

            if (isArray) {
                return value.map((v: any) => {
                    builtParameters.push(v);
                    return "$" + builtParameters.length;
                }).join(", ");

            } else if (value instanceof Function) {
                return value();

            } else {
                builtParameters.push(value);
                return "$" + builtParameters.length;
            }
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, builtParameters];
    }

    /**
     * Escapes a column name.
     */
    escape(columnName: string): string {
        return "\"" + columnName + "\"";
    }

    /**
     * Build full table name with schema name and table name.
     * E.g. "mySchema"."myTable"
     */
    buildTableName(tableName: string, schema?: string): string {
        return schema ? `${schema}.${tableName}` : tableName;
    }

    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column: { type?: ColumnType, length?: number | string, precision?: number, scale?: number, isArray?: boolean, isGenerated?: boolean, generationStrategy?: "increment"|"uuid"|"rowid" }): string {
        if (column.type === Number) {
            return "int4";

        } else if (column.type === "integer" || column.type === "int" || column.type === "bigint" || column.type === "int64") {
            return "int8";

        } else if (column.type === String || column.type === "character varying" || column.type === "char varying") {
            return "varchar";

        } else if (column.type === Date || column.type === "timestamp without time zone") {
            return "timestamp";

        } else if (column.type === "timestamp with time zone") {
            return "timestamptz";

        } else if (column.type === "time without time zone") {
            return "time";

        } else if (column.type === Boolean || column.type === "boolean") {
            return "bool";

        } else if (column.type === "simple-array" || column.type === "simple-json" || column.type === "text") {
            return "string";

        } else if (column.type === "bytea" || column.type === "blob") {
            return "bytes";

        } else if (column.type === "smallint") {
            return "int2";

        } else if (column.type === "numeric" || column.type === "dec") {
            return "decimal";

        } else if (column.type === "double precision" || column.type === "float") {
            return "float8";

        } else if (column.type === "real") {
            return "float4";

        } else if (column.type === "character") {
            return "char";

        } else if (column.type === "json") {
            return "jsonb";

        } else {
            return column.type as string || "";
        }
    }

    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata: ColumnMetadata): string {
        const defaultValue = columnMetadata.default;
        const arrayCast = columnMetadata.isArray ? `::${columnMetadata.type}[]` : "";

        if (typeof defaultValue === "number") {
            return "" + defaultValue;

        } else if (typeof defaultValue === "boolean") {
            return defaultValue === true ? "true" : "false";

        } else if (typeof defaultValue === "function") {
            return defaultValue();

        } else if (typeof defaultValue === "string") {
            return `'${defaultValue}'${arrayCast}`;

        } else if (defaultValue === null) {
            return `null`;

        } else if (typeof defaultValue === "object") {
            return `'${JSON.stringify(defaultValue)}'`;

        } else {
            return defaultValue;
        }
    }

    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column: ColumnMetadata): boolean {
        return column.entityMetadata.uniques.some(uq => uq.columns.length === 1 && uq.columns[0] === column);
    }

    /**
     * Returns default column lengths, which is required on column creation.
     */
    getColumnLength(column: ColumnMetadata): string {
        return column.length ? column.length.toString() : "";
    }

    /**
     * Creates column type definition including length, precision and scale
     */
    createFullType(column: TableColumn): string {
        let type = column.type;

        if (column.length) {
            type += "(" + column.length + ")";
        } else if (column.precision !== null && column.precision !== undefined && column.scale !== null && column.scale !== undefined) {
            type += "(" + column.precision + "," + column.scale + ")";
        } else if (column.precision !== null && column.precision !== undefined) {
            type +=  "(" + column.precision + ")";
        }

        if (column.isArray)
            type += " array";

        return type;
    }

    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection(): Promise<any> {
        return new Promise((ok, fail) => {
            this.master.connect((err: any, connection: any, release: any) => {
                err ? fail(err) : ok([connection, release]);
            });
        });
    }

    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<any> {
        if (!this.slaves.length)
            return this.obtainMasterConnection();

        return new Promise((ok, fail) => {
            const random = Math.floor(Math.random() * this.slaves.length);
            this.slaves[random].connect((err: any, connection: any, release: any) => {
                err ? fail(err) : ok([connection, release]);
            });
        });
    }

    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     *
     * todo: slow. optimize Object.keys(), OrmUtils.mergeDeep and column.createValueMap parts
     */
    createGeneratedMap(metadata: EntityMetadata, insertResult: ObjectLiteral) {
        if (!insertResult)
            return undefined;

        return Object.keys(insertResult).reduce((map, key) => {
            const column = metadata.findColumnWithDatabaseName(key);
            if (column) {
                OrmUtils.mergeDeep(map, column.createValueMap(this.prepareHydratedValue(insertResult[key], column)));
            }
            return map;
        }, {} as ObjectLiteral);
    }

    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(tableColumns: TableColumn[], columnMetadatas: ColumnMetadata[]): ColumnMetadata[] {
        return columnMetadatas.filter(columnMetadata => {
            const tableColumn = tableColumns.find(c => c.name === columnMetadata.databaseName);
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed

            // console.log("table:", columnMetadata.entityMetadata.tableName);
            // console.log("name:", tableColumn.name, columnMetadata.databaseName);
            // console.log("type:", tableColumn.type, this.normalizeType(columnMetadata));
            // console.log("length:", tableColumn.length, columnMetadata.length);
            // console.log("width:", tableColumn.width, columnMetadata.width);
            // console.log("precision:", tableColumn.precision, columnMetadata.precision);
            // console.log("scale:", tableColumn.scale, columnMetadata.scale);
            // console.log("comment:", tableColumn.comment, columnMetadata.comment);
            // console.log("default:", tableColumn.default, columnMetadata.default);
            // console.log("default changed:", !this.compareDefaultValues(this.normalizeDefault(columnMetadata), tableColumn.default));
            // console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            // console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            // console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            // console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            // console.log("==========================================");

            return tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== this.normalizeType(columnMetadata)
                || tableColumn.length !== columnMetadata.length
                || tableColumn.precision !== columnMetadata.precision
                || tableColumn.scale !== columnMetadata.scale
                // || tableColumn.comment !== columnMetadata.comment // todo
                || (!tableColumn.isGenerated && this.lowerDefaultValueIfNecessary(this.normalizeDefault(columnMetadata)) !== tableColumn.default) // we included check for generated here, because generated columns already can have default values
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== this.normalizeIsUnique(columnMetadata)
                || tableColumn.isGenerated !== columnMetadata.isGenerated;
        });
    }

    private lowerDefaultValueIfNecessary(value: string | undefined) {
        if (!value) {
            return value;
        }
        return value.split(`'`).map((v, i) => {
            return i % 2 === 1 ? v : v.toLowerCase();
        }).join(`'`);
    }
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(): boolean {
        return true;
    }

    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    isUUIDGenerationSupported(): boolean {
        return true;
    }

    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName: string, index: number): string {
        return "$" + (index + 1);
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Loads postgres query stream package.
     */
    loadStreamDependency() {
        try {
            return PlatformTools.load("pg-query-stream");

        } catch (e) { // todo: better error for browser env
            throw new Error(`To use streams you should install pg-query-stream package. Please run npm i pg-query-stream --save command.`);
        }
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void {
        try {
            this.postgres = PlatformTools.load("pg");
            try {
                const pgNative = PlatformTools.load("pg-native");
                if (pgNative && this.postgres.native) this.postgres = this.postgres.native;

            } catch (e) { }

        } catch (e) { // todo: better error for browser env
            throw new DriverPackageNotInstalledError("Postgres", "pg");
        }
    }

    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected async createPool(options: CockroachConnectionOptions, credentials: CockroachConnectionCredentialsOptions): Promise<any> {

        credentials = Object.assign({}, credentials, DriverUtils.buildDriverOptions(credentials)); // todo: do it better way

        // build connection options for the driver
        const connectionOptions = Object.assign({}, {
            host: credentials.host,
            user: credentials.username,
            password: credentials.password,
            database: credentials.database,
            port: credentials.port,
            ssl: credentials.ssl
        }, options.extra || {});

        // create a connection pool
        const pool = new this.postgres.Pool(connectionOptions);
        const { logger } = this.connection;

        const poolErrorHandler = options.poolErrorHandler || ((error: any) => logger.log("warn", `Postgres pool raised an error. ${error}`));

        /*
          Attaching an error handler to pool errors is essential, as, otherwise, errors raised will go unhandled and
          cause the hosting app to crash.
         */
        pool.on("error", poolErrorHandler);

        return new Promise((ok, fail) => {
            pool.connect((err: any, connection: any, release: Function) => {
                if (err) return fail(err);
                release();
                ok(pool);
            });
        });
    }

    /**
     * Closes connection pool.
     */
    protected async closePool(pool: any): Promise<void> {
        await Promise.all(this.connectedQueryRunners.map(queryRunner => queryRunner.release()));
        return new Promise<void>((ok, fail) => {
            pool.end((err: any) => err ? fail(err) : ok());
        });
    }

}
