import { getMetadataArgsStorage } from "../index";
import { UniqueMetadataArgs } from "../metadata-args/UniqueMetadataArgs";
import { UniqueOptions } from "./options/UniqueOptions";

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(options?: UniqueOptions): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(name: string, options?: UniqueOptions): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(name: string, options: { synchronize: false }): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(name: string, fields: string[], options?: UniqueOptions): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(fields: string[], options?: UniqueOptions): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(fields: (object?: any) => (any[] | { [key: string]: number }), options?: UniqueOptions): ClassDecorator & PropertyDecorator;

/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(name: string, fields: (object?: any) => (any[] | { [key: string]: number }), options?: UniqueOptions): ClassDecorator & PropertyDecorator;


/**
 * Composite unique constraint must be set on entity classes and must specify entity's fields to be unique.
 */
export function Unique(nameOrFieldsOrOptions?: string | string[] | ((object: any) => (any[] | { [key: string]: number })) | UniqueOptions,
    maybeFieldsOrOptions?: ((object?: any) => (any[] | { [key: string]: number })) | UniqueOptions | string[] | { synchronize: false },
    maybeOptions?: UniqueOptions): ClassDecorator & PropertyDecorator {

    const name = typeof nameOrFieldsOrOptions === "string" ? nameOrFieldsOrOptions : undefined;
    const fields = typeof nameOrFieldsOrOptions === "string" ? <((object?: any) => (any[] | { [key: string]: number })) | string[]>maybeFieldsOrOptions : nameOrFieldsOrOptions as string[];
    let options = (typeof nameOrFieldsOrOptions === "object" && !Array.isArray(nameOrFieldsOrOptions)) ? nameOrFieldsOrOptions as UniqueOptions : maybeOptions;
    if (!options)
        options = (typeof maybeFieldsOrOptions === "object" && !Array.isArray(maybeFieldsOrOptions)) ? maybeFieldsOrOptions as UniqueOptions : maybeOptions;

    return function (clsOrObject: Function | Object, propertyName?: string | symbol) {

        getMetadataArgsStorage().uniques.push({
            target: propertyName ? clsOrObject.constructor : clsOrObject as Function,
            name: name,
            columns: propertyName ? [propertyName] : fields,
            options: options,
        } as UniqueMetadataArgs);
    };
}