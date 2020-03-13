/**
 * List of types that FindOperator can be.
 */
export type FindOperatorType =
    | "not"
    | "lessThan"
    | "lessThanOrEqual"
    | "moreThan"
    | "moreThanOrEqual"
    | "equal"
    | "between"
    | "in"
    | "any"
    | "isNull"
    | "like"
    | "ilike"
    | "raw"
    | "if"
    | "switch";
