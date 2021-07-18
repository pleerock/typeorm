import { FindManyOptions } from "../find-options/FindManyOptions";

/**
 * Defines a special criteria to count specific entity.
 */
export interface CountOptions<Entity = any> extends FindManyOptions<Entity> {
    /**
     * Specifies whether the selection is DISTINCT.
     */
    distinct?: boolean;
}
