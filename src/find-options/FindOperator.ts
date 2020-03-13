import {FindOperatorType} from "./FindOperatorType";
import {Connection} from "../";

/**
 * Find Operator used in Find Conditions.
 */
export class FindOperator<T> {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Operator type.
     */
    type: FindOperatorType;

    // -------------------------------------------------------------------------
    // Private Properties
    // -------------------------------------------------------------------------

    /**
     * Parameter value.
     */
    private _value: T|FindOperator<T>;

    /**
     * Indicates if parameter is used or not for this operator.
     */
    private _useParameter: boolean;

    /**
     * Indicates if multiple parameters must be used for this operator.
     */
    private _multipleParameters: boolean;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(type: FindOperatorType,
                value: T|FindOperator<T>,
                useParameter: boolean = true,
                multipleParameters: boolean = false) {
        this.type = type;
        this._useParameter = useParameter;
        this._multipleParameters = multipleParameters;
        this._value = value;
        // if (condition !== undefined) {
        //     this.condition = condition;
        //     this._useParameter = condition === true ? true : false;
        // }
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /**
     * Indicates if parameter is used or not for this operator.
     * Extracts final value if value is another find operator.
     */
    get useParameter(): boolean {
        if (this._value instanceof FindOperator)
            return this._value.useParameter;

        return this._useParameter;
    }

    /**
     * Indicates if multiple parameters must be used for this operator.
     * Extracts final value if value is another find operator.
     */
    get multipleParameters(): boolean {
        if (this._value instanceof FindOperator)
            return this._value.multipleParameters;

        return this._multipleParameters;
    }

    /**
     * Gets the final value needs to be used as parameter value.
     */
    get value(): T|any {
        if (this._value instanceof FindOperator)
            return this._value.value;

        return this._value;
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Gets SQL needs to be inserted into final query.
     */
    toSql(connection: Connection, aliasPath: string, parameters: string[]): string {
        switch (this.type) {
            case "not":
                if (this._value instanceof FindOperator) {
                    return `NOT(${this._value.toSql(connection, aliasPath, parameters)})`;
                } else {
                    return `${aliasPath} != ${parameters[0]}`;
                }
            case "lessThan":
                return `${aliasPath} < ${parameters[0]}`;
            case "lessThanOrEqual":
                return `${aliasPath} <= ${parameters[0]}`;
            case "moreThan":
                return `${aliasPath} > ${parameters[0]}`;
            case "moreThanOrEqual":
                return `${aliasPath} >= ${parameters[0]}`;
            case "equal":
                return `${aliasPath} = ${parameters[0]}`;
            case "like":
                return `${aliasPath} LIKE ${parameters[0]}`;
            case "ilike":
                return `${aliasPath} ILIKE ${parameters[0]}`;
            case "between":
                return `${aliasPath} BETWEEN ${parameters[0]} AND ${parameters[1]}`;
            case "in":
                return `${aliasPath} IN (${parameters.join(", ")})`;
            case "any":
                return `${aliasPath} = ANY(${parameters[0]})`;
            case "isNull":
                return `${aliasPath} IS NULL`;
            case "raw":
                if (this.value instanceof Function) {
                    return this.value(aliasPath);
                } else {
                    return `${aliasPath} = ${this.value}`;
                }
        }

        return "";
    }

}