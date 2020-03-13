import {ColumnOptions, ColumnType, getMetadataArgsStorage} from "../../";
import {ColumnTypeUndefinedError} from "../../error/ColumnTypeUndefinedError";
import {PrimaryColumnCannotBeNullableError} from "../../error/PrimaryColumnCannotBeNullableError";
import {ColumnMetadataArgs} from "../../metadata-args/ColumnMetadataArgs";
import {GeneratedMetadataArgs} from "../../metadata-args/GeneratedMetadataArgs";

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 * Primary columns also creates a PRIMARY KEY for this column in a db.
 */
export function PrimaryColumn(options?: ColumnOptions): Function;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 * Primary columns also creates a PRIMARY KEY for this column in a db.
 */
export function PrimaryColumn(type?: ColumnType, options?: ColumnOptions): Function;

/**
 * Column decorator is used to mark a specific class property as a table column.
 * Only properties decorated with this decorator will be persisted to the database when entity be saved.
 * Primary columns also creates a PRIMARY KEY for this column in a db.
 */
export function PrimaryColumn(typeOrOptions?: ColumnType|ColumnOptions, options?: ColumnOptions): Function {
    return function (object: Object, propertyName: string) {

        // normalize parameters
        let type: ColumnType|undefined;
        if (typeof typeOrOptions === "string") {
            type = <ColumnType> typeOrOptions;
        } else {
            options = Object.assign({}, <ColumnOptions> typeOrOptions);
        }
        if (!options) options = {} as ColumnOptions;

        // if type is not given explicitly then try to guess it
        const reflectMetadataType = Reflect && (Reflect as any).getMetadata ? (Reflect as any).getMetadata("design:type", object, propertyName) : undefined;
        if (!type && reflectMetadataType)
            type = reflectMetadataType;

        // check if there is no type in column options then set type from first function argument, or guessed one
        if (!options.type && type)
            options.type = type;

        // if we still don't have a type then we need to give error to user that type is required
        if (!options.type)
            throw new ColumnTypeUndefinedError(object, propertyName);

        // check if column is not nullable, because we cannot allow a primary key to be nullable
        if (options.nullable)
            throw new PrimaryColumnCannotBeNullableError(object, propertyName);

        // explicitly set a primary to column options
        options.primary = true;

        // create and register a new column metadata
        getMetadataArgsStorage().columns.push({
            target: object.constructor,
            propertyName: propertyName,
            mode: "regular",
            options: options
        } as ColumnMetadataArgs);

        if (options.generated) {
            getMetadataArgsStorage().generations.push({
                target: object.constructor,
                propertyName: propertyName,
                strategy: typeof options.generated === "string" ? options.generated : "increment"
            } as GeneratedMetadataArgs);
        }
    };
}

