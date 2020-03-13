import {QueryRunner} from "../query-runner/QueryRunner";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {ObjectLiteral} from "../common/ObjectLiteral";
import {ColumnType} from "./types/ColumnTypes";
import {MappedColumnTypes} from "./types/MappedColumnTypes";
import {SchemaBuilder} from "../schema-builder/SchemaBuilder";
import {DataTypeDefaults} from "./types/DataTypeDefaults";
import {BaseConnectionOptions} from "../connection/BaseConnectionOptions";
import {TableColumn} from "../schema-builder/table/TableColumn";
import {EntityMetadata} from "../metadata/EntityMetadata";

/**
 * Driver organizes TypeORM communication with specific database management system.
 */
export interface Driver {

    /**
     * Connection options.
     */
    options: BaseConnectionOptions;

    /**
     * Master database used to perform all write queries.
     *
     * todo: probably move into query runner.
     */
    database?: string;

    /**
     * Indicates if replication is enabled.
     */
    isReplicated: boolean;

    /**
     * Indicates if tree tables are supported by this driver.
     */
    treeSupport: boolean;

    /**
     * Gets list of supported column data types by a driver.
     */
    supportedDataTypes: ColumnType[];

    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults;

    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[];

    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[];

    /**
     * Gets list of column data types that support precision by a driver.
     */
    withPrecisionColumnTypes: ColumnType[];

    /**
     * Gets list of column data types that support scale by a driver.
     */
    withScaleColumnTypes: ColumnType[];

    /**
     * Orm has special columns and we need to know what database column types should be for those types.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes;

    /**
     * Max length allowed by the DBMS for aliases (execution of queries).
     */
    maxAliasLength?: number;

    /**
     * Performs connection to the database.
     * Depend on driver type it may create a connection pool.
     */
    connect(): Promise<void>;

    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect(): Promise<void>;

    /**
     * Closes connection with database and releases all resources.
     */
    disconnect(): Promise<void>;

    /**
     * Synchronizes database schema (creates tables, indices, etc).
     */
    createSchemaBuilder(): SchemaBuilder;

    /**
     * Creates a query runner used for common queries.
     */
    createQueryRunner(mode: "master"|"slave"): QueryRunner;

    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql: string, parameters: ObjectLiteral, nativeParameters: ObjectLiteral): [string, any[]];

    /**
     * Escapes a table name, column name or an alias.
     *
     * todo: probably escape should be able to handle dots in the names and automatically escape them
     */
    escape(name: string): string;

    /**
     * Build full table name with database name, schema name and table name.
     * E.g. "myDB"."mySchema"."myTable"
     */
    buildTableName(tableName: string, schema?: string, database?: string): string;

    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, column: ColumnMetadata): any;

    /**
     * Prepares given value to a value to be persisted, based on its column type.
     */
    prepareHydratedValue(value: any, column: ColumnMetadata): any;

    /**
     * Transforms type of the given column to a database column type.
     */
    normalizeType(column: { type?: ColumnType|string, length?: number | string, precision?: number, scale?: number, isArray?: boolean }): string;

    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata: ColumnMetadata): string;

    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column: ColumnMetadata): boolean;

    /**
     * Calculates column length taking into account the default length values.
     */
    getColumnLength(column: ColumnMetadata): string;

    /**
     * Normalizes "default" value of the column.
     */
    createFullType(column: TableColumn): string;

    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection(): Promise<any>;

    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<any>;

    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(metadata: EntityMetadata, insertResult: any): ObjectLiteral|undefined;

    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(tableColumns: TableColumn[], columnMetadatas: ColumnMetadata[]): ColumnMetadata[];

    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(): boolean;

    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    isUUIDGenerationSupported(): boolean;

    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName: string, index: number): string;

}
