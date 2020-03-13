import {FindOperator} from "../FindOperator";

/**
 * If Helper Operator.
 */
export function If<T1>(condition: any, value1: T1): T1|undefined;

/**
 * If Helper Operator.
 */
export function If<T1, T2>(condition: any, value1: T1, value2: T2): T1|T2|undefined;

/**
 * If Helper Operator.
 */
export function If<T1, T2>(condition: any, value1: T1, value2: T2|undefined = undefined): T1|T2|undefined {
    if (condition) {
        if (value1 instanceof FindOperator)
            return value1;

        return value1;
    } else {
        if (value2 instanceof FindOperator)
            return value2;
        if (value2 === undefined)
            return undefined;

        return value2;
    }
}