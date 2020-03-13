import {EntityMetadata} from "../../metadata/EntityMetadata";
import {QueryBuilderUtils} from "../QueryBuilderUtils";
import {RelationMetadata} from "../../metadata/RelationMetadata";
import {QueryExpressionMap} from "../QueryExpressionMap";
import {SelectQueryBuilder} from "../SelectQueryBuilder";
import {ObjectUtils} from "../../util/ObjectUtils";

export class RelationCountAttribute {

    /**
     * Alias of the joined (destination) table.
     */
    alias?: string;

    /**
     * Name of relation.
     */
    relationName: string;

    /**
     * Property + alias of the object where to joined data should be mapped.
     */
    mapToProperty: string;

    /**
     * Extra condition applied to "ON" section of join.
     */
    queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private expressionMap: QueryExpressionMap,
                relationCountAttribute?: Partial<RelationCountAttribute>) {
        ObjectUtils.assign(this, relationCountAttribute || {});
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    get joinInverseSideMetadata(): EntityMetadata {
        return this.relation.inverseEntityMetadata;
    }

    /**
     * Alias of the parent of this join.
     * For example, if we join ("post.category", "categoryAlias") then "post" is a parent alias.
     * This value is extracted from entityOrProperty value.
     * This is available when join was made using "post.category" syntax.
     */
    get parentAlias(): string {
        if (!QueryBuilderUtils.isAliasProperty(this.relationName))
            throw new Error(`Given value must be a string representation of alias property`);

        return this.relationName.split(".")[0];
    }

    /**
     * Relation property name of the parent.
     * This is used to understand what is joined.
     * For example, if we join ("post.category", "categoryAlias") then "category" is a relation property.
     * This value is extracted from entityOrProperty value.
     * This is available when join was made using "post.category" syntax.
     */
    get relationProperty(): string|undefined {
        if (!QueryBuilderUtils.isAliasProperty(this.relationName))
            throw new Error(`Given value is a string representation of alias property`);

        return this.relationName.split(".")[1];
    }

    get junctionAlias(): string {
        const [parentAlias, relationProperty] = QueryBuilderUtils.extractAliasAndPropertyPath(this.relationName);
        return parentAlias + "_" + relationProperty.replace(".", "_") + "_rc";
    }

    /**
     * Relation of the parent.
     * This is used to understand what is joined.
     * This is available when join was made using "post.category" syntax.
     */
    get relation(): RelationMetadata {
        if (!QueryBuilderUtils.isAliasProperty(this.relationName))
            throw new Error(`Given value is a string representation of alias property`);

        const [parentAlias, propertyPath] = QueryBuilderUtils.extractAliasAndPropertyPath(this.relationName);
        const relationOwnerSelection = this.expressionMap.findAliasByName(parentAlias);
        const relation = relationOwnerSelection.metadata.findRelationWithPropertyPath(propertyPath);
        if (!relation)
            throw new Error(`Relation with property path ${propertyPath} in entity was not found.`);
        return relation;
    }

    /**
     * Metadata of the joined entity.
     * If table without entity was joined, then it will return undefined.
     */
    get metadata(): EntityMetadata {
        if (!QueryBuilderUtils.isAliasProperty(this.relationName))
            throw new Error(`Given value is a string representation of alias property`);

        const parentAlias = this.relationName.split(".")[0];
        const selection = this.expressionMap.findAliasByName(parentAlias);
        return selection.metadata;
    }

    get mapToPropertyPropertyName(): string {
        return QueryBuilderUtils.extractAliasAndPropertyPath(this.mapToProperty!)[1];
    }

}
