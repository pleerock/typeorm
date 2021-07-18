import {CountOptions} from "./CountOptions";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";

/**
 * Utilities to work with CountOptions.
 */
export class CountOptionsUtils {

    // -------------------------------------------------------------------------
    // Public Static Methods
    // -------------------------------------------------------------------------

    /**
     * Checks if given object is really instance of CountOptions interface.
     */
    static isCountOptions<Entity = any>(obj: any): obj is CountOptions<Entity> {
        const possibleOptions: CountOptions<Entity> = obj;
        return possibleOptions &&
                (
                    typeof possibleOptions.distinct === "boolean"
                );
    }

    /**
     * Applies give count options to the given query builder.
     */
    static applyCountOptionsToQueryBuilder<T>(qb: SelectQueryBuilder<T>, options: CountOptions<T>|Partial<T>|undefined): SelectQueryBuilder<T> {
        if (this.isCountOptions(options)) {
            if (options.distinct !== undefined && options.distinct === false) {
                qb.setOption("disable-count-distinct");
            }
        }

        return qb;
    }

}
