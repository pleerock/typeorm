import {ColumnType, Connection, EntityMetadata, ObjectLiteral, TableColumn} from "../..";
import {DriverPackageNotInstalledError} from "../../error/DriverPackageNotInstalledError";
import {ColumnMetadata} from "../../metadata/ColumnMetadata";
import {PlatformTools} from "../../platform/PlatformTools";
import {RdbmsSchemaBuilder} from "../../schema-builder/RdbmsSchemaBuilder";
import {ApplyValueTransformers} from "../../util/ApplyValueTransformers";
import {DateUtils} from "../../util/DateUtils";
import {OrmUtils} from "../../util/OrmUtils";
import {Driver} from "../Driver";
import {DataTypeDefaults} from "../types/DataTypeDefaults";
import {MappedColumnTypes} from "../types/MappedColumnTypes";
import {SapConnectionOptions} from "./SapConnectionOptions";
import {SapQueryRunner} from "./SapQueryRunner";

/**
 * Organizes communication with SAP Hana DBMS.
 *
 * todo: looks like there is no built in support for connection pooling, we need to figure out something
 */
export class SapDriver implements Driver {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used by driver.
     */
    connection: Connection;

    /**
     * Hana Pool instance.
     */
    client: any;

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
    options: SapConnectionOptions;

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
     * @see https://help.sap.com/viewer/4fe29514fd584807ac9f2a04f6754767/2.0.03/en-US/20a1569875191014b507cf392724b7eb.html
     */
    supportedDataTypes: ColumnType[] = [
        "tinyint",
        "smallint",
        "int",
        "integer",
        "bigint",
        "smalldecimal",
        "decimal",
        "dec",
        "real",
        "double",
        "float",
        "date",
        "time",
        "seconddate",
        "timestamp",
        "boolean",
        "char",
        "nchar",
        "varchar",
        "nvarchar",
        "text",
        "alphanum",
        "shorttext",
        "array",
        "varbinary",
        "blob",
        "clob",
        "nclob",
        "st_geometry",
        "st_point",
    ];

    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[] = [
        "st_geometry",
        "st_point",
    ];

    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[] = [
        "varchar",
        "nvarchar",
        "alphanum",
        "shorttext",
        "varbinary"
    ];

    /**
     * Gets list of column data types that support precision by a driver.
     */
    withPrecisionColumnTypes: ColumnType[] = [
        "decimal",
    ];

    /**
     * Gets list of column data types that support scale by a driver.
     */
    withScaleColumnTypes: ColumnType[] = [
        "decimal",
    ];

    /**
     * Orm has special columns and we need to know what database column types should be for those types.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes = {
        createDate: "timestamp",
        createDateDefault: "CURRENT_TIMESTAMP",
        updateDate: "timestamp",
        updateDateDefault: "CURRENT_TIMESTAMP",
        deleteDate: "timestamp",
        deleteDateNullable: true,
        version: "integer",
        treeLevel: "integer",
        migrationId: "integer",
        migrationName: "nvarchar",
        migrationTimestamp: "bigint",
        cacheId: "integer",
        cacheIdentifier: "nvarchar",
        cacheTime: "bigint",
        cacheDuration: "integer",
        cacheQuery: "nvarchar(5000)" as any,
        cacheResult: "text",
        metadataType: "nvarchar",
        metadataDatabase: "nvarchar",
        metadataSchema: "nvarchar",
        metadataTable: "nvarchar",
        metadataName: "nvarchar",
        metadataValue: "nvarchar(5000)" as any,
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
        "shorttext": { length: 255 },
        "varbinary": { length: 255 },
        "decimal": { precision: 18, scale: 0 },
    };

    /**
     * Max length allowed by SAP HANA for aliases (identifiers).
     * @see https://help.sap.com/viewer/4fe29514fd584807ac9f2a04f6754767/2.0.03/en-US/20a760537519101497e3cfe07b348f3c.html
     */
    maxAliasLength = 128;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection) {
        this.connection = connection;
        this.options = connection.options as SapConnectionOptions;
        this.loadDependencies();
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
        // HANA connection info
        const dbParams = {
            hostName: this.options.host,
            port: this.options.port,
            userName: this.options.username,
            password: this.options.password,
            ...this.options.extra
        };

        if (this.options.database) dbParams.databaseName = this.options.database;
        if (this.options.encrypt) dbParams.encrypt = this.options.encrypt;
        if (this.options.validateCertificate) dbParams.validateCertificate = this.options.validateCertificate;
        if (this.options.key) dbParams.key = this.options.key;
        if (this.options.cert) dbParams.cert = this.options.cert;
        if (this.options.ca) dbParams.ca = this.options.ca;

        // pool options
        const options: any = {
            min: this.options.pool && this.options.pool.min ? this.options.pool.min : 1,
            max: this.options.pool && this.options.pool.max ? this.options.pool.max : 1,
        };

        if (this.options.pool && this.options.pool.checkInterval) options.checkInterval = this.options.pool.checkInterval;
        if (this.options.pool && this.options.pool.maxWaitingRequests) options.maxWaitingRequests = this.options.pool.maxWaitingRequests;
        if (this.options.pool && this.options.pool.requestTimeout) options.requestTimeout = this.options.pool.requestTimeout;
        if (this.options.pool && this.options.pool.idleTimeout) options.idleTimeout = this.options.pool.idleTimeout;

        const { logger } = this.connection;

        const poolErrorHandler = options.poolErrorHandler || ((error: any) => logger.log("warn", `SAP Hana pool raised an error. ${error}`));
        this.client.eventEmitter.on("poolError", poolErrorHandler);

        // create the pool
        this.master = this.client.createPool(dbParams, options);

        this.database = this.options.database;
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
        const promise = this.master.clear();
        this.master = undefined;
        return promise;
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
        return new SapQueryRunner(this, mode);
    }

    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql: string, parameters: ObjectLiteral, nativeParameters: ObjectLiteral): [string, any[]] {
        const builtParameters: any[] = Object.keys(nativeParameters).map(key => {
            return nativeParameters[key];
        });

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
                    return "?";
                    // return "$" + builtParameters.length;
                }).join(", ");

            } else if (value instanceof Function) {
                return value();

            } else {
                builtParameters.push(value);
                return "?";
                // return "$" + builtParameters.length;
            }
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, builtParameters];
    }

    /**
     * Escapes a column name.
     */
    escape(columnName: string): string {
        return `"${columnName}"`;
    }

    /**
     * Build full table name with schema name and table name.
     * E.g. "mySchema"."myTable"
     */
    buildTableName(tableName: string, schema?: string): string {
        return schema ? `${schema}.${tableName}` : tableName;
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

        } else if (columnMetadata.type === "timestamp"
            || columnMetadata.type === Date) {
            return DateUtils.mixedDateToDatetimeString(value, true);

        } else if (columnMetadata.type === "seconddate") {
            return DateUtils.mixedDateToDatetimeString(value, false);

        } else if (columnMetadata.type === "simple-array") {
            return DateUtils.simpleArrayToString(value);

        } else if (columnMetadata.type === "simple-json") {
            return DateUtils.simpleJsonToString(value);

        } else if (columnMetadata.type === "simple-enum") {
            return DateUtils.simpleEnumToString(value);

        } else if (columnMetadata.isArray) {
            return () => `ARRAY(${value.map((it: any) => `'${it}'`)})`;
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

        } else if (columnMetadata.type === "timestamp"
            || columnMetadata.type === "seconddate"
            || columnMetadata.type === Date) {
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
        if (column.type === Number || column.type === "int") {
            return "integer";

        } else if (column.type === String) {
            return "nvarchar";

        } else if (column.type === Date) {
            return "timestamp";

        } else if (column.type === Boolean) {
            return "boolean";

        } else if ((column.type as any) === Buffer) {
            return "blob";

        } else if (column.type === "uuid") {
            return "nvarchar";

        } else if (column.type === "simple-array" || column.type === "simple-json") {
            return "text";

        } else if (column.type === "simple-enum") {
            return "nvarchar";

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
            return defaultValue === true ? "true" : "false";

        } else if (typeof defaultValue === "function") {
            return defaultValue();

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
        return column.entityMetadata.indices.some(idx => idx.isUnique && idx.columns.length === 1 && idx.columns[0] === column);
    }

    /**
     * Returns default column lengths, which is required on column creation.
     */
    getColumnLength(column: ColumnMetadata|TableColumn): string {
        if (column.length)
            return column.length.toString();

        if (column.generationStrategy === "uuid")
            return "36";

        switch (column.type) {
            case "varchar":
            case "nvarchar":
            case "shorttext":
            case String:
                return "255";
            case "alphanum":
                return "127";
            case "varbinary":
                return "255";
        }

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
            type += `(${column.precision})`;
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
        return this.master.getConnection();
    }

    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<any> {
        return this.obtainMasterConnection();
    }

    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(metadata: EntityMetadata, insertResult: ObjectLiteral) {
        const generatedMap = metadata.generatedColumns.reduce((map, generatedColumn) => {
            let value: any;
            if (generatedColumn.generationStrategy === "increment" && insertResult) {
                value = insertResult;
                // } else if (generatedColumn.generationStrategy === "uuid") {
                //     console.log("getting db value:", generatedColumn.databaseName);
                //     value = generatedColumn.getEntityValue(uuidMap);
            }

            return OrmUtils.mergeDeep(map, generatedColumn.createValueMap(value));
        }, {} as ObjectLiteral);

        return Object.keys(generatedMap).length > 0 ? generatedMap : undefined;
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
            // console.log("default:", tableColumn.default, columnMetadata.default);
            // console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            // console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            // console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            // console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            // console.log((columnMetadata.generationStrategy !== "uuid" && tableColumn.isGenerated !== columnMetadata.isGenerated));
            // console.log("==========================================");

            const normalizeDefault = this.normalizeDefault(columnMetadata);
            const hanaNullComapatibleDefault = normalizeDefault == null ? undefined : normalizeDefault;

            return  tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== this.normalizeType(columnMetadata)
                || tableColumn.length !== columnMetadata.length
                || tableColumn.precision !== columnMetadata.precision
                || tableColumn.scale !== columnMetadata.scale
                // || tableColumn.comment !== columnMetadata.comment || // todo
                || (!tableColumn.isGenerated && (hanaNullComapatibleDefault !== tableColumn.default)) // we included check for generated here, because generated columns already can have default values
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== this.normalizeIsUnique(columnMetadata)
                || tableColumn.isGenerated !== columnMetadata.isGenerated;
        });
    }

    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(): boolean {
        return false;
    }

    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    isUUIDGenerationSupported(): boolean {
        return false;
    }

    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName: string, index: number): string {
        return "?";
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    protected loadDependencies(): void {
        try {
            this.client = PlatformTools.load("hdb-pool");

        } catch (e) { // todo: better error for browser env
            throw new DriverPackageNotInstalledError("SAP Hana", "hdb-pool");
        }

        try {
            PlatformTools.load("@sap/hana-client");

        } catch (e) { // todo: better error for browser env
            throw new DriverPackageNotInstalledError("SAP Hana", "@sap/hana-client");
        }
    }

}
