import {FindOperator} from "./FindOperator";

/**
 * Used for find operations.
 */
type FindCondition<T> = FindConditions<T> | FindOperator<FindConditions<T>>;
export type FindConditions<T> = T | {
    [P in keyof T]?: T[P] extends Promise<infer U>
        ? FindCondition<U>
        : FindCondition<T[P]>;
};
