import {Any, Between, Equal, ILike, In, LessThan, Like, MoreThan, Not, Raw} from "..";
import {FindOperator} from "./FindOperator";
import {FindOptions} from "./FindOptions";

/**
 * Utilities to work with FindOptions.
 */
export class FindOptionsUtils {

    /**
     * Checks if given object is really instance of FindOneOptions interface.
     */
    static isFindOptions(obj: any): obj is FindOptions<any> {
        const possibleOptions: FindOptions<any> = obj;
        return possibleOptions && (
            possibleOptions.select instanceof Object ||
            possibleOptions.where instanceof Object ||
            possibleOptions.relations instanceof Object ||
            possibleOptions.order instanceof Object ||
            possibleOptions.options instanceof Object ||
            possibleOptions.cache instanceof Object ||
            possibleOptions.lock instanceof Object ||
            typeof possibleOptions.cache === "boolean" ||
            typeof possibleOptions.cache === "number" ||
            typeof possibleOptions.skip === "number" ||
            typeof possibleOptions.take === "number" ||
            typeof possibleOptions.skip === "string" ||
            typeof possibleOptions.take === "string"
        );
    }

}

/**
 * Normalizes find options.
 */
export function normalizeFindOptions<T>(options: FindOptions<T>): FindOptions<T> {

    const where = options.where;
    if (!where)
        return { ...options };
    if (!(where instanceof Object))
        return { ...options };
    if (where instanceof FindOperator)
        return { ...options };

    const recursively$FindOption = (obj: any) => {
        const valueKeys = Object.keys(obj);
        if (valueKeys.length === 1) {
            let value = obj[valueKeys[0]];
            if (value instanceof Object && !(value instanceof Array) && !(value instanceof Function))
                value = recursively$FindOption(value);

            if (valueKeys[0] === "$any") {
                return Any(value);

            } else if (valueKeys[0] === "$between") {
                return Between(value[0], value[1]);

            } else if (valueKeys[0] === "$equal") {
                return Equal(value);

            } else if (valueKeys[0] === "$iLike") {
                return ILike(value);

            } else if (valueKeys[0] === "$in") {
                return In(value);

            } else if (valueKeys[0] === "$lessThan") {
                return LessThan(value);

            } else if (valueKeys[0] === "$like") {
                return Like(value);

            } else if (valueKeys[0] === "$moreThan") {
                return MoreThan(value);

            } else if (valueKeys[0] === "$not") {
                return Not(value);

            } else if (valueKeys[0] === "$raw") {
                return Raw(value);
            }
        }

        return false;
    };

    const recursivelyWhere = <T extends any>(where: T): T => {

        if ((where as any) instanceof Array)
            return where.map((where: any) => recursivelyWhere(where));

        return Object.keys(where).reduce((newWhere, key) => {
            if (where[key] instanceof Object && !(where[key] instanceof FindOperator)) {
                newWhere[key] = recursively$FindOption(where[key]);

                // in the case if $find operator was not found we'll have a false as a value
                // we need to recursive where because it can be another where options
                if (newWhere[key] === false)
                    newWhere[key] = recursivelyWhere(where[key]);

            } else {
                newWhere[key] = where[key];
            }
            return newWhere;
        }, {} as T);
    };

    // todo: broken after merge
    // if (options.lock) {
    //     if (options.lock.mode === "optimistic") {
    //         qb.setLock(options.lock.mode, options.lock.version as any);
    //     } else if (options.lock.mode === "pessimistic_read" || options.lock.mode === "pessimistic_write") {
    //         qb.setLock(options.lock.mode);
    //     }
    // }

    return { ...options, where: recursivelyWhere(options.where!) };
}
