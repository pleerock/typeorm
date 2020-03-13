import {ValueTransformer} from "../decorator/options/ValueTransformer";

export class ApplyValueTransformers {
    static transformFrom(transformer: ValueTransformer | ValueTransformer[], databaseValue: any) {
        if (Array.isArray(transformer)) {
            const reverseTransformers = transformer.slice().reverse();
            return reverseTransformers.reduce((transformedValue, _transformer) => {
                if (_transformer.from !== undefined) {
                    return _transformer.from(transformedValue);
                }
                return transformedValue;
            }, databaseValue);
        }
        if (transformer.from !== undefined) {
            return transformer.from(databaseValue);
        }
        return databaseValue;
    }
    static transformTo(transformer: ValueTransformer | ValueTransformer[], entityValue: any) {
        if (Array.isArray(transformer)) {
            return transformer.reduce((transformedValue, _transformer) => {
                if (_transformer.to !== undefined) {
                    return _transformer.to(transformedValue);
                }
                return transformedValue;
            }, entityValue);
        }
        if (transformer.to !== undefined) {
            return transformer.to(entityValue);
        }
        return entityValue;
    }
}
