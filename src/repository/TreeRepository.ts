import { Repository } from "./Repository";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { AbstractSqliteDriver } from "../driver/sqlite-abstract/AbstractSqliteDriver";
import { TypeORMError } from "../error/TypeORMError";
import { FindTreesOptions } from "./FindTreesOptions";

/**
 * Repository with additional functions to work with trees.
 *
 * @see Repository
 */
export class TreeRepository<Entity> extends Repository<Entity> {

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Gets complete trees for all roots in the table.
     */
    async findTrees(options?: FindTreesOptions): Promise<Entity[]> {
        const roots = await this.findRoots();
        await Promise.all(roots.map(root => this.findDescendantsTree(root, options)));
        return roots;
    }

    /**
     * Roots are entities that have no ancestors. Finds them all.
     */
    findRoots(): Promise<Entity[]> {
        const escapeAlias = (alias: string) => this.manager.connection.driver.escape(alias);
        const escapeColumn = (column: string) => this.manager.connection.driver.escape(column);
        const parentPropertyName = this.manager.connection.namingStrategy.joinColumnName(
            this.metadata.treeParentRelation!.propertyName, this.metadata.primaryColumns[0].propertyName
        );

        return this.createQueryBuilder("treeEntity")
            .where(`${escapeAlias("treeEntity")}.${escapeColumn(parentPropertyName)} IS NULL`)
            .getMany();
    }

    /**
     * Gets all children (descendants) of the given entity. Returns them all in a flat array.
     */
    findDescendants(entity: Entity): Promise<Entity[]> {
        return this
            .createDescendantsQueryBuilder("treeEntity", "treeClosure", entity)
            .getMany();
    }

    /**
     * Gets all children (descendants) of the given entity. Returns them in a tree - nested into each other.
     */
    findDescendantsTree(entity: Entity, options?: FindTreesOptions): Promise<Entity> {
        // todo: throw exception if there is no column of this relation?
        return this
            .createDescendantsQueryBuilder("treeEntity", "treeClosure", entity)
            .getRawAndEntities()
            .then(entitiesAndScalars => {
                const relationMaps = this.createRelationMaps("treeEntity", entitiesAndScalars.raw);
                this.buildChildrenEntityTree(entity, entitiesAndScalars.entities, relationMaps, {
                    depth: -1,
                    ...options

                });
                return entity;
            });
    }

    /**
     * Gets number of descendants of the entity.
     */
    countDescendants(entity: Entity): Promise<number> {
        return this
            .createDescendantsQueryBuilder("treeEntity", "treeClosure", entity)
            .getCount();
    }

    /**
     * Creates a query builder used to get descendants of the entities in a tree.
     */
    createDescendantsQueryBuilder(alias: string, closureTableAlias: string, entity: Entity): SelectQueryBuilder<Entity> {

        // create shortcuts for better readability
        const escape = (alias: string) => this.manager.connection.driver.escape(alias);

        if (this.metadata.treeType === "closure-table") {

            const joinCondition = this.metadata.closureJunctionTable.descendantColumns.map(column => {
                return escape(closureTableAlias) + "." + escape(column.propertyPath) + " = " + escape(alias) + "." + escape(column.referencedColumn!.propertyPath);
            }).join(" AND ");

            const parameters: ObjectLiteral = {};
            const whereCondition = this.metadata.closureJunctionTable.ancestorColumns.map(column => {
                parameters[column.referencedColumn!.propertyName] = column.referencedColumn!.getEntityValue(entity);
                return escape(closureTableAlias) + "." + escape(column.propertyPath) + " = :" + column.referencedColumn!.propertyName;
            }).join(" AND ");

            return this
                .createQueryBuilder(alias)
                .innerJoin(this.metadata.closureJunctionTable.tableName, closureTableAlias, joinCondition)
                .where(whereCondition)
                .setParameters(parameters);

        } else if (this.metadata.treeType === "nested-set") {

            const whereCondition = alias + "." + this.metadata.nestedSetLeftColumn!.propertyPath + " BETWEEN " +
                "joined." + this.metadata.nestedSetLeftColumn!.propertyPath + " AND joined." + this.metadata.nestedSetRightColumn!.propertyPath;
            const parameters: ObjectLiteral = {};
            const joinCondition = this.metadata.treeParentRelation!.joinColumns.map(joinColumn => {
                const parameterName = joinColumn.referencedColumn!.propertyPath.replace(".", "_");
                parameters[parameterName] = joinColumn.referencedColumn!.getEntityValue(entity);
                return "joined." + joinColumn.referencedColumn!.propertyPath + " = :" + parameterName;
            }).join(" AND ");

            return this
                .createQueryBuilder(alias)
                .innerJoin(this.metadata.targetName, "joined", whereCondition)
                .where(joinCondition, parameters);

        } else if (this.metadata.treeType === "materialized-path") {
            return this
                .createQueryBuilder(alias)
                .where(qb => {
                    const subQuery = qb.subQuery()
                        .select(`${this.metadata.targetName}.${this.metadata.materializedPathColumn!.propertyPath}`, "path")
                        .from(this.metadata.target, this.metadata.targetName)
                        .whereInIds(this.metadata.getEntityIdMap(entity));

                    if (this.manager.connection.driver instanceof AbstractSqliteDriver) {
                        return `${alias}.${this.metadata.materializedPathColumn!.propertyPath} LIKE ${subQuery.getQuery()} || '%'`;
                    } else {
                        return `${alias}.${this.metadata.materializedPathColumn!.propertyPath} LIKE CONCAT(${subQuery.getQuery()}, '%')`;
                    }
                });
        }

        throw new TypeORMError(`Supported only in tree entities`);
    }

    /**
     * Gets all parents (ancestors) of the given entity. Returns them all in a flat array.
     */
    findAncestors(entity: Entity): Promise<Entity[]> {
        return this
            .createAncestorsQueryBuilder("treeEntity", "treeClosure", entity)
            .getMany();
    }

    /**
     * Gets all parents (ancestors) of the given entity. Returns them in a tree - nested into each other.
     */
    findAncestorsTree(entity: Entity): Promise<Entity> {
        // todo: throw exception if there is no column of this relation?
        return this
            .createAncestorsQueryBuilder("treeEntity", "treeClosure", entity)
            .getRawAndEntities()
            .then(entitiesAndScalars => {
                const relationMaps = this.createRelationMaps("treeEntity", entitiesAndScalars.raw);
                this.buildParentEntityTree(entity, entitiesAndScalars.entities, relationMaps);
                return entity;
            });
    }

    /**
     * Gets number of ancestors of the entity.
     */
    countAncestors(entity: Entity): Promise<number> {
        return this
            .createAncestorsQueryBuilder("treeEntity", "treeClosure", entity)
            .getCount();
    }

    /**
     * Creates a query builder used to get ancestors of the entities in the tree.
     */
    createAncestorsQueryBuilder(alias: string, closureTableAlias: string, entity: Entity): SelectQueryBuilder<Entity> {

        // create shortcuts for better readability
        // const escape = (alias: string) => this.manager.connection.driver.escape(alias);

        if (this.metadata.treeType === "closure-table") {
            const joinCondition = this.metadata.closureJunctionTable.ancestorColumns.map(column => {
                return closureTableAlias + "." + column.propertyPath + " = " + alias + "." + column.referencedColumn!.propertyPath;
            }).join(" AND ");

            const parameters: ObjectLiteral = {};
            const whereCondition = this.metadata.closureJunctionTable.descendantColumns.map(column => {
                parameters[column.referencedColumn!.propertyName] = column.referencedColumn!.getEntityValue(entity);
                return closureTableAlias + "." + column.propertyPath + " = :" + column.referencedColumn!.propertyName;
            }).join(" AND ");

            return this
                .createQueryBuilder(alias)
                .innerJoin(this.metadata.closureJunctionTable.tableName, closureTableAlias, joinCondition)
                .where(whereCondition)
                .setParameters(parameters);

        } else if (this.metadata.treeType === "nested-set") {

            const joinCondition = "joined." + this.metadata.nestedSetLeftColumn!.propertyPath + " BETWEEN " +
                alias + "." + this.metadata.nestedSetLeftColumn!.propertyPath + " AND " + alias + "." + this.metadata.nestedSetRightColumn!.propertyPath;
            const parameters: ObjectLiteral = {};
            const whereCondition = this.metadata.treeParentRelation!.joinColumns.map(joinColumn => {
                const parameterName = joinColumn.referencedColumn!.propertyPath.replace(".", "_");
                parameters[parameterName] = joinColumn.referencedColumn!.getEntityValue(entity);
                return "joined." + joinColumn.referencedColumn!.propertyPath + " = :" + parameterName;
            }).join(" AND ");

            return this
                .createQueryBuilder(alias)
                .innerJoin(this.metadata.targetName, "joined", joinCondition)
                .where(whereCondition, parameters);


        } else if (this.metadata.treeType === "materialized-path") {
            // example: SELECT * FROM category category WHERE (SELECT mpath FROM `category` WHERE id = 2) LIKE CONCAT(category.mpath, '%');
            return this
                .createQueryBuilder(alias)
                .where(qb => {
                    const subQuery = qb.subQuery()
                        .select(`${this.metadata.targetName}.${this.metadata.materializedPathColumn!.propertyPath}`, "path")
                        .from(this.metadata.target, this.metadata.targetName)
                        .whereInIds(this.metadata.getEntityIdMap(entity));

                    if (this.manager.connection.driver instanceof AbstractSqliteDriver) {
                        return `${subQuery.getQuery()} LIKE ${alias}.${this.metadata.materializedPathColumn!.propertyPath} || '%'`;

                    } else {
                        return `${subQuery.getQuery()} LIKE CONCAT(${alias}.${this.metadata.materializedPathColumn!.propertyPath}, '%')`;
                    }
                });
        }

        throw new TypeORMError(`Supported only in tree entities`);
    }

    /**
     * Moves entity to the children of then given entity.
     *
    move(entity: Entity, to: Entity): Promise<void> {
        return Promise.resolve();
    } */

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    protected createRelationMaps(alias: string, rawResults: any[]): { id: any, parentId: any }[] {
        return rawResults.map(rawResult => {
            const joinColumn = this.metadata.treeParentRelation!.joinColumns[0];
            // fixes issue #2518, default to databaseName property when givenDatabaseName is not set
            const joinColumnName = joinColumn.givenDatabaseName || joinColumn.databaseName;
            const id = rawResult[alias + "_" + this.metadata.primaryColumns[0].databaseName];
            const parentId = rawResult[alias + "_" + joinColumnName];
            return {
                id: this.manager.connection.driver.prepareHydratedValue(id, this.metadata.primaryColumns[0]),
                parentId: this.manager.connection.driver.prepareHydratedValue(parentId, joinColumn),
            };
        });
    }

    protected buildChildrenEntityTree(entity: any, entities: any[], relationMaps: { id: any, parentId: any }[], options: (FindTreesOptions & { depth: number })): void {
        const childProperty = this.metadata.treeChildrenRelation!.propertyName;
        if (options.depth === 0) {
            entity[childProperty] = [];
            return;
        }
        const parentEntityId = this.metadata.primaryColumns[0].getEntityValue(entity);
        const childRelationMaps = relationMaps.filter(relationMap => relationMap.parentId === parentEntityId);
        const childIds = new Set(childRelationMaps.map(relationMap => relationMap.id));
        entity[childProperty] = entities.filter(entity => childIds.has(this.metadata.primaryColumns[0].getEntityValue(entity)));
        entity[childProperty].forEach((childEntity: any) => {
            this.buildChildrenEntityTree(childEntity, entities, relationMaps, { ...options, depth: options.depth - 1 });
        });
    }

    protected buildParentEntityTree(entity: any, entities: any[], relationMaps: { id: any, parentId: any }[]): void {
        const parentProperty = this.metadata.treeParentRelation!.propertyName;
        const entityId = this.metadata.primaryColumns[0].getEntityValue(entity);
        const parentRelationMap = relationMaps.find(relationMap => relationMap.id === entityId);
        const parentEntity = entities.find(entity => {
            if (!parentRelationMap)
                return false;

            return this.metadata.primaryColumns[0].getEntityValue(entity) === parentRelationMap.parentId;
        });
        if (parentEntity) {
            entity[parentProperty] = parentEntity;
            this.buildParentEntityTree(entity[parentProperty], entities, relationMaps);
        }
    }

}
