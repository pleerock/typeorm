import {Driver} from "../Driver";
import {ConnectionIsNotSetError} from "../../error/ConnectionIsNotSetError";
import {DriverPackageNotInstalledError} from "../../error/DriverPackageNotInstalledError";
import {DriverUtils} from "../DriverUtils";
import {SqlServerQueryRunner} from "./SqlServerQueryRunner";
import {ObjectLiteral} from "../../common/ObjectLiteral";
import {ColumnMetadata} from "../../metadata/ColumnMetadata";
import {DateUtils} from "../../util/DateUtils";
import {PlatformTools} from "../../platform/PlatformTools";
import {Connection} from "../../connection/Connection";
import {RdbmsSchemaBuilder} from "../../schema-builder/RdbmsSchemaBuilder";
import {SqlServerConnectionOptions} from "./SqlServerConnectionOptions";
import {MappedColumnTypes} from "../types/MappedColumnTypes";
import {ColumnType} from "../types/ColumnTypes";
import {DataTypeDefaults} from "../types/DataTypeDefaults";
import {MssqlParameter} from "./MssqlParameter";
import {TableColumn} from "../../schema-builder/table/TableColumn";
import {SqlServerConnectionCredentialsOptions} from "./SqlServerConnectionCredentialsOptions";
import {EntityMetadata} from "../../metadata/EntityMetadata";
import {OrmUtils} from "../../util/OrmUtils";
import {ApplyValueTransformers} from "../../util/ApplyValueTransformers";

/**
 * Organizes communication with SQL Server DBMS.
 */
export class SqlServerDriver implements Driver {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used by driver.
     */
    connection: Connection;

    /**
     * SQL Server library.
     */
    mssql: any;

    /**
     * Pool for master database.
     */
    master: any;

    /**
     * Pool for slave databases.
     * Used in replication.
     */
    slaves: any[] = [];

    // -------------------------------------------------------------------------
    // Public Implemented Properties
    // -------------------------------------------------------------------------

    /**
     * Connection options.
     */
    options: SqlServerConnectionOptions;

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
     * @see https://docs.microsoft.com/en-us/sql/t-sql/data-types/data-types-transact-sql
     */
    supportedDataTypes: ColumnType[] = [
        "int",
        "bigint",
        "bit",
        "decimal",
        "money",
        "numeric",
        "smallint",
        "smallmoney",
        "tinyint",
        "float",
        "real",
        "date",
        "datetime2",
        "datetime",
        "datetimeoffset",
        "smalldatetime",
        "time",
        "char",
        "varchar",
        "text",
        "nchar",
        "nvarchar",
        "ntext",
        "binary",
        "image",
        "varbinary",
        "hierarchyid",
        "sql_variant",
        "timestamp",
        "uniqueidentifier",
        "xml",
        "geometry",
        "geography",
        "rowversion"
    ];

    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[] = [
        "geometry",
        "geography"
    ];

    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[] = [
        "char",
        "varchar",
        "nchar",
        "nvarchar",
        "binary",
        "varbinary"
    ];

    /**
     * Gets list of column data types that support precision by a driver.
     */
    withPrecisionColumnTypes: ColumnType[] = [
        "decimal",
        "numeric",
        "time",
        "datetime2",
        "datetimeoffset"
    ];

    /**
     * Gets list of column data types that support scale by a driver.
     */
    withScaleColumnTypes: ColumnType[] = [
        "decimal",
        "numeric"
    ];

    /**
     * Orm has special columns and we need to know what database column types should be for those types.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes = {
        createDate: "datetime2",
        createDateDefault: "getdate()",
        updateDate: "datetime2",
        updateDateDefault: "getdate()",
        deleteDate: "datetime2",
        deleteDateNullable: true,
        version: "int",
        treeLevel: "int",
        migrationId: "int",
        migrationName: "varchar",
        migrationTimestamp: "bigint",
        cacheId: "int",
        cacheIdentifier: "nvarchar",
        cacheTime: "bigint",
        cacheDuration: "int",
        cacheQuery: "nvarchar(MAX)" as any,
        cacheResult: "nvarchar(MAX)" as any,
        metadataType: "varchar",
        metadataDatabase: "varchar",
        metadataSchema: "varchar",
        metadataTable: "varchar",
        metadataName: "varchar",
        metadataValue: "nvarchar(MAX)" as any,
    };

    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults = {
        "char": { length: 1 },
        "nchar": { length: 1 },
        "varchar": { length: 255 },
        "nvarchar": { length: 255 },
        "binary": { length: 1 },
        "varbinary": { length: 1 },
        "decimal": { precision: 18, scale: 0 },
        "numeric": { precision: 18, scale: 0 },
        "time": { precision: 7 },
        "datetime2": { precision: 7 },
        "datetimeoffset": { precision: 7 }
    };

    /**
     * Max length allowed by MSSQL Server for aliases (identifiers).
     * @see https://docs.microsoft.com/en-us/sql/sql-server/maximum-capacity-specifications-for-sql-server
     */
    maxAliasLength = 128;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection) {
        this.connection = connection;
        this.options = connection.options as SqlServerConnectionOptions;
        this.isReplicated = this.options.replication ? true : false;

        // load mssql package
        this.loadDependencies();

        // Object.assign(connection.options, DriverUtils.buildDriverOptions(connection.options)); // todo: do it better way
        // validate options to make sure everything is set
        // if (!this.options.host)
            // throw new DriverOptionNotSetError("host");
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
    afterConnect(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Closes connection with the database.
     */
    async disconnect(): Promise<void> {
        if (!this.master)
            return Promise.reject(new ConnectionIsNotSetError("mssql"));

        await this.closePool(this.master);
        await Promise.all(this.slaves.map(slave => this.closePool(slave)));
        this.master = undefined;
        this.slaves = [];
    }


    /**
     * Closes connection pool.
     */
    protected async closePool(pool: any): Promise<void> {
        return new Promise<void>((ok, fail) => {
            pool.close((err: any) => err ? fail(err) : ok());
        });
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
        return new SqlServerQueryRunner(this, mode);
    }

    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql: string, parameters: ObjectLiteral, nativeParameters: ObjectLiteral): [string, any[]] {
        const escapedParameters: any[] = Object.keys(nativeParameters).map(key => nativeParameters[key]);
        if (!parameters || !Object.keys(parameters).length)
            return [sql, escapedParameters];

        const keys = Object.keys(parameters).map(parameter => "(:(\\.\\.\\.)?" + parameter + "\\b)").join("|");
        sql = sql.replace(new RegExp(keys, "g"), (key: string) => {
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
                    escapedParameters.push(v);
                    return "@" + (escapedParameters.length - 1);
                }).join(", ");

            } else if (value instanceof Function) {
                return value();

            } else {
                escapedParameters.push(value);
                return "@" + (escapedParameters.length - 1);
            }
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, escapedParameters];
    }

    /**
     * Escapes a column name.
     */
    escape(columnName: string): string {
        return `"${columnName}"`;
    }

    /**
     * Build full table name with database name, schema name and table name.
     * E.g. "myDB"."mySchema"."myTable"
     */
    buildTableName(tableName: string, schema?: string, database?: string): string {
        let fullName = tableName;
        if (schema)
            fullName = schema + "." + tableName;
        if (database) {
            if (!schema) {
                fullName = database + ".." + tableName;
            } else {
                fullName = database + "." + fullName;
            }
        }

        return fullName;
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
            return DateUtils.mixedDateToDate(value);

        } else if (columnMetadata.type === "time") {
            return DateUtils.mixedTimeToDate(value);

        } else if (columnMetadata.type === "datetime"
            || columnMetadata.type === "smalldatetime"
            || columnMetadata.type === Date) {
            return DateUtils.mixedDateToDate(value, false, false);

        } else if (columnMetadata.type === "datetime2"
            || columnMetadata.type === "datetimeoffset") {
            return DateUtils.mixedDateToDate(value, false, true);

        } else if (columnMetadata.type === "simple-array") {
            return DateUtils.simpleArrayToString(value);

        } else if (columnMetadata.type === "simple-json") {
            return DateUtils.simpleJsonToString(value);

        } else if (columnMetadata.type === "simple-enum") {
            return DateUtils.simpleEnumToString(value);

        }

        return value;
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    prepareHydratedValue(value: any, columnMetadata: ColumnMetadata): any {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;

        if (columnMetadata.type === Boolean) {
            value = value ? true : false;

        } else if (columnMetadata.type === "datetime"
            || columnMetadata.type === Date
            || columnMetadata.type === "datetime2"
            || columnMetadata.type === "smalldatetime"
            || columnMetadata.type === "datetimeoffset") {
            value = DateUtils.normalizeHydratedDate(value);

        } else if (columnMetadata.type === "date") {
            value = DateUtils.mixedDateToDateString(value);

        } else if (columnMetadata.type === "time") {
            value = DateUtils.mixedTimeToString(value);

        } else if (columnMetadata.type === "simple-array") {
            value = DateUtils.stringToSimpleArray(value);

        } else if (columnMetadata.type === "simple-json") {
            value = DateUtils.stringToSimpleJson(value);

        } else if (columnMetadata.type === "simple-enum") {
            value = DateUtils.stringToSimpleEnum(value, columnMetadata);

        }

        if (columnMetadata.transformer)
            value = ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);

        return value;
    }

    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column: { type?: ColumnType, length?: number | string, precision?: number, scale?: number }): string {
        if (column.type === Number || column.type === "integer") {
            return "int";

        } else if (column.type === String) {
            return "nvarchar";

        } else if (column.type === Date) {
            return "datetime";

        } else if (column.type === Boolean) {
            return "bit";

        } else if ((column.type as any) === Buffer) {
            return "binary";

        } else if (column.type === "uuid") {
            return "uniqueidentifier";

        } else if (column.type === "simple-array" || column.type === "simple-json") {
            return "ntext";

        } else if (column.type === "simple-enum") {
            return "nvarchar";

        } else if (column.type === "dec") {
            return "decimal";

        } else if (column.type === "double precision") {
            return "float";

        } else if (column.type === "rowversion") {
            return "timestamp";  // the rowversion type's name in SQL server metadata is timestamp

        } else {
            return column.type as string || "";
        }
    }

    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata: ColumnMetadata): string {
        const defaultValue = columnMetadata.default;

        if (typeof defaultValue === "number") {
            return "" + defaultValue;

        } else if (typeof defaultValue === "boolean") {
            return defaultValue === true ? "1" : "0";

        } else if (typeof defaultValue === "function") {
            return /*"(" + */defaultValue()/* + ")"*/;

        } else if (typeof defaultValue === "string") {
            return `'${defaultValue}'`;

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
    getColumnLength(column: ColumnMetadata|TableColumn): string {
        if (column.length)
            return column.length.toString();

        if (column.type === "varchar" || column.type === "nvarchar" || column.type === String)
            return "255";

        return "";
    }

    /**
     * Creates column type definition including length, precision and scale
     */
    createFullType(column: TableColumn): string {
        let type = column.type;

        // used 'getColumnLength()' method, because SqlServer sets `varchar` and `nvarchar` length to 1 by default.
        if (this.getColumnLength(column)) {
            type += `(${this.getColumnLength(column)})`;

        } else if (column.precision !== null && column.precision !== undefined && column.scale !== null && column.scale !== undefined) {
            type += `(${column.precision},${column.scale})`;

        } else if (column.precision !== null && column.precision !== undefined) {
            type +=  `(${column.precision})`;
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
        return Promise.resolve(this.master);
    }

    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<any> {
        if (!this.slaves.length)
            return this.obtainMasterConnection();

        const random = Math.floor(Math.random() * this.slaves.length);
        return Promise.resolve(this.slaves[random]);
    }

    /**
     * Creates generated map of values generated or returned by database after INSERT query.
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

            return  tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== this.normalizeType(columnMetadata)
                || tableColumn.length !== columnMetadata.length
                || tableColumn.precision !== columnMetadata.precision
                || tableColumn.scale !== columnMetadata.scale
                // || tableColumn.comment !== columnMetadata.comment || // todo
                || (!tableColumn.isGenerated  // we included check for generated here, because generated columns already can have default values
                    && this.lowerDefaultValueIfNessesary(this.normalizeDefault(columnMetadata)) !== this.lowerDefaultValueIfNessesary(tableColumn.default)
                    && !(this.normalizeDefault(columnMetadata) === null && typeof tableColumn.default === "undefined"))
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== this.normalizeIsUnique(columnMetadata)
                || tableColumn.isGenerated !== columnMetadata.isGenerated;
        });
    }
    private lowerDefaultValueIfNessesary(value: string | undefined) {
        // SqlServer saves function calls in default value as lowercase https://github.com/typeorm/typeorm/issues/2733
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
        if (this.options.options && this.options.options.disableOutputReturning) {
            return false;
        }
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
        return "@" + index;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Sql server's parameters needs to be wrapped into special object with type information about this value.
     * This method wraps given value into MssqlParameter based on its column definition.
     */
    parametrizeValue(column: ColumnMetadata, value: any) {

        // if its already MssqlParameter then simply return it
        if (value instanceof MssqlParameter)
            return value;

        const normalizedType = this.normalizeType({ type: column.type });
        if (column.length) {
            return new MssqlParameter(value, normalizedType as any, column.length as any);

        } else if (column.precision !== null && column.precision !== undefined && column.scale !== null && column.scale !== undefined) {
            return new MssqlParameter(value, normalizedType as any, column.precision, column.scale);

        } else if (column.precision !== null && column.precision !== undefined) {
            return new MssqlParameter(value, normalizedType as any, column.precision);

        } else if (column.scale !== null && column.scale !== undefined) {
            return new MssqlParameter(value, normalizedType as any, column.scale);
        }

        return new MssqlParameter(value, normalizedType as any);
    }

    /**
     * Sql server's parameters needs to be wrapped into special object with type information about this value.
     * This method wraps all values of the given object into MssqlParameter based on their column definitions in the given table.
     */
    parametrizeMap(tablePath: string, map: ObjectLiteral): ObjectLiteral {

        // find metadata for the given table
        if (!this.connection.hasMetadata(tablePath)) // if no metadata found then we can't proceed because we don't have columns and their types
            return map;
        const metadata = this.connection.getMetadata(tablePath);

        return Object.keys(map).reduce((newMap, key) => {
            const value = map[key];

            // find column metadata
            const column = metadata.findColumnWithDatabaseName(key);
            if (!column) // if we didn't find a column then we can't proceed because we don't have a column type
                return value;

            newMap[key] = this.parametrizeValue(column, value);
            return newMap;
        }, {} as ObjectLiteral);
    }

    buildTableVariableDeclaration(identifier: string, columns: ColumnMetadata[]): string {
        const outputColumns = columns.map(column => {
            return `${this.escape(column.databaseName)} ${this.createFullType(new TableColumn({
                name: column.databaseName,
                type: this.normalizeType(column),
                length: column.length,
                isNullable: column.isNullable,
                isArray: column.isArray,
            }))}`;
        });

        return `DECLARE ${identifier} TABLE (${outputColumns.join(", ")})`;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void {
        try {
            this.mssql = PlatformTools.load("mssql");

        } catch (e) { // todo: better error for browser env
            throw new DriverPackageNotInstalledError("SQL Server", "mssql");
        }
    }

    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected createPool(options: SqlServerConnectionOptions, credentials: SqlServerConnectionCredentialsOptions): Promise<any> {

        credentials = Object.assign({}, credentials, DriverUtils.buildDriverOptions(credentials)); // todo: do it better way

        // build connection options for the driver
        const connectionOptions = Object.assign({}, {
            connectionTimeout: this.options.connectionTimeout,
            requestTimeout: this.options.requestTimeout,
            stream: this.options.stream,
            pool: this.options.pool,
            options: this.options.options,
        }, {
            server: credentials.host,
            user: credentials.username,
            password: credentials.password,
            database: credentials.database,
            port: credentials.port,
            domain: credentials.domain,
        }, options.extra || {});

        // set default useUTC option if it hasn't been set
        if (!connectionOptions.options) connectionOptions.options = { useUTC: false };
        else if (!connectionOptions.options.useUTC) connectionOptions.options.useUTC = false;

        // pooling is enabled either when its set explicitly to true,
        // either when its not defined at all (e.g. enabled by default)
        return new Promise<void>((ok, fail) => {
            const pool = new this.mssql.ConnectionPool(connectionOptions);

            const { logger } = this.connection;

            const poolErrorHandler = (options.pool && options.pool.errorHandler) || ((error: any) => logger.log("warn", `MSSQL pool raised an error. ${error}`));
            /*
              Attaching an error handler to pool errors is essential, as, otherwise, errors raised will go unhandled and
              cause the hosting app to crash.
             */
            pool.on("error", poolErrorHandler);

            const connection = pool.connect((err: any) => {
                if (err) return fail(err);
                ok(connection);
            });
        });
    }

}
