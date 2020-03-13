import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {EntityManager, EntityMetadata, ObjectLiteral, QueryRunner, TreeRepository} from "..";
import {AbstractSqliteDriver} from "../driver/sqlite-abstract/AbstractSqliteDriver";
import {createLiteralRepository} from "./LiteralRepository";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {EntityTarget} from "../common/EntityTarget";

/**
 * Repository is supposed to work with your entity objects. Find entities, insert, update, delete, etc.
 */
export function createLiteralTreeRepository<Entity>({ manager, target, queryRunner }: {
    manager: EntityManager,
    target: EntityTarget<Entity>,
    queryRunner?: QueryRunner,
}): TreeRepository<Entity> {

    function createRelationMaps(metadata: EntityMetadata, alias: string, rawResults: any[]): { id: any, parentId: any }[] {
        return rawResults.map(rawResult => {
            const joinColumn = metadata.treeParentRelation!.joinColumns[0];
            // fixes issue #2518, default to databaseName property when givenDatabaseName is not set
            const joinColumnName = joinColumn.givenDatabaseName || joinColumn.databaseName;
            const id = rawResult[alias + "_" + metadata.primaryColumns[0].databaseName];
            const parentId = rawResult[alias + "_" + joinColumnName];
            return {
                id: metadata.connection.driver.prepareHydratedValue(id, metadata.primaryColumns[0]),
                parentId: metadata.connection.driver.prepareHydratedValue(parentId, joinColumn),
            };
        });
    }

    function buildChildrenEntityTree(metadata: EntityMetadata, entity: any, entities: any[], relationMaps: { id: any, parentId: any }[]): void {
        const childProperty = metadata.treeChildrenRelation!.propertyName;
        const parentEntityId = metadata.primaryColumns[0].getEntityValue(entity);
        const childRelationMaps = relationMaps.filter(relationMap => relationMap.parentId === parentEntityId);
        const childIds = new Set(childRelationMaps.map(relationMap => relationMap.id));
        entity[childProperty] = entities.filter(entity => childIds.has(entity.id));
        entity[childProperty].forEach((childEntity: any) => {
            buildChildrenEntityTree(metadata, childEntity, entities, relationMaps);
        });
    }

    function buildParentEntityTree(metadata: EntityMetadata, entity: any, entities: any[], relationMaps: { id: any, parentId: any }[]): void {
        const parentProperty = metadata.treeParentRelation!.propertyName;
        const entityId = metadata.primaryColumns[0].getEntityValue(entity);
        const parentRelationMap = relationMaps.find(relationMap => relationMap.id === entityId);
        const parentEntity = entities.find(entity => {
            if (!parentRelationMap)
                return false;

            return entity[metadata.primaryColumns[0].propertyName] === parentRelationMap.parentId;
        });
        if (parentEntity) {
            entity[parentProperty] = parentEntity;
            buildParentEntityTree(metadata, entity[parentProperty], entities, relationMaps);
        }
    }

    // -------------------------------------------------------------------------

    return {
        ...createLiteralRepository({ manager, target, queryRunner }),
        typeof: "TreeRepository",

        async findTrees(): Promise<Entity[]> {
            const roots = await this.findRoots();
            await Promise.all(roots.map((root: any) => this.findDescendantsTree(root)));
            return roots;
        },

        findRoots(): Promise<Entity[]> {
            const escapeAlias = (alias: string) => this.manager.connection.driver.escape(alias);
            const escapeColumn = (column: string) => this.manager.connection.driver.escape(column);
            const parentPropertyName = this.manager.connection.namingStrategy.joinColumnName(
                this.getMetadata().treeParentRelation!.propertyName, "id"
            );

            return this.createQueryBuilder("treeEntity")
                .where(`${escapeAlias("treeEntity")}.${escapeColumn(parentPropertyName)} IS NULL`)
                .getMany();
        },

        findDescendants(entity: Entity): Promise<Entity[]> {
            return this
                .createDescendantsQueryBuilder("treeEntity", "treeClosure", entity)
                .getMany();
        },

        findDescendantsTree(entity: Entity): Promise<Entity> {
            // todo: throw exception if there is no column of this relation?
            return this
                .createDescendantsQueryBuilder("treeEntity", "treeClosure", entity)
                .getRawAndEntities()
                .then((entitiesAndScalars: { entities: Entity[], raw: any[] }) => {
                    const relationMaps = createRelationMaps(this.getMetadata(), "treeEntity", entitiesAndScalars.raw);
                    buildChildrenEntityTree(this.getMetadata(), entity, entitiesAndScalars.entities, relationMaps);
                    return entity;
                });
        },

        countDescendants(entity: Entity): Promise<number> {
            return this
                .createDescendantsQueryBuilder("treeEntity", "treeClosure", entity)
                .getCount();
        },

        createDescendantsQueryBuilder(alias: string, closureTableAlias: string, entity: Entity): SelectQueryBuilder<Entity> {

            // create shortcuts for better readability
            const escape = (alias: string) => this.manager.connection.driver.escape(alias);

            if (this.getMetadata().treeType === "closure-table") {

                const joinCondition = this.getMetadata().closureJunctionTable.descendantColumns.map((column: ColumnMetadata) => {
                    return escape(closureTableAlias) + "." + escape(column.propertyPath) + " = " + escape(alias) + "." + escape(column.referencedColumn!.propertyPath);
                }).join(" AND ");

                const parameters: ObjectLiteral = {};
                const whereCondition = this.getMetadata().closureJunctionTable.ancestorColumns.map((column: ColumnMetadata) => {
                    parameters[column.referencedColumn!.propertyName] = column.referencedColumn!.getEntityValue(entity);
                    return escape(closureTableAlias) + "." + escape(column.propertyPath) + " = :" + column.referencedColumn!.propertyName;
                }).join(" AND ");

                return this
                    .createQueryBuilder(alias)
                    .innerJoin(this.getMetadata().closureJunctionTable.tableName, closureTableAlias, joinCondition)
                    .where(whereCondition)
                    .setParameters(parameters);

            } else if (this.getMetadata().treeType === "nested-set") {

                const whereCondition = alias + "." + this.getMetadata().nestedSetLeftColumn!.propertyPath + " BETWEEN " +
                    "joined." + this.getMetadata().nestedSetLeftColumn!.propertyPath + " AND joined." + this.getMetadata().nestedSetRightColumn!.propertyPath;
                const parameters: ObjectLiteral = {};
                const joinCondition = this.getMetadata().treeParentRelation!.joinColumns.map((joinColumn: ColumnMetadata) => {
                    const parameterName = joinColumn.referencedColumn!.propertyPath.replace(".", "_");
                    parameters[parameterName] = joinColumn.referencedColumn!.getEntityValue(entity);
                    return "joined." + joinColumn.referencedColumn!.propertyPath + " = :" + parameterName;
                }).join(" AND ");

                return this
                    .createQueryBuilder(alias)
                    .innerJoin(this.getMetadata().targetName, "joined", whereCondition)
                    .where(joinCondition, parameters);

            } else if (this.getMetadata().treeType === "materialized-path") {
                return this
                    .createQueryBuilder(alias)
                    .where((qb: SelectQueryBuilder<any>) => {
                        const subQuery = qb.subQuery()
                            .select(`${this.getMetadata().targetName}.${this.getMetadata().materializedPathColumn!.propertyPath}`, "path")
                            .from(this.getMetadata().target, this.getMetadata().targetName)
                            .whereInIds(this.getMetadata().getEntityIdMap(entity));

                        qb.setNativeParameters(subQuery.expressionMap.nativeParameters);
                        if (this.manager.connection.driver instanceof AbstractSqliteDriver) {
                            return `${alias}.${this.getMetadata().materializedPathColumn!.propertyPath} LIKE ${subQuery.getQuery()} || '%'`;
                        } else {
                            return `${alias}.${this.getMetadata().materializedPathColumn!.propertyPath} LIKE CONCAT(${subQuery.getQuery()}, '%')`;
                        }
                    });
            }

            throw new Error(`Supported only in tree entities`);
        },

        findAncestors(entity: Entity): Promise<Entity[]> {
            return this
                .createAncestorsQueryBuilder("treeEntity", "treeClosure", entity)
                .getMany();
        },

        findAncestorsTree(entity: Entity): Promise<Entity> {
            // todo: throw exception if there is no column of this relation?
            return this
                .createAncestorsQueryBuilder("treeEntity", "treeClosure", entity)
                .getRawAndEntities()
                .then((entitiesAndScalars: { entities: Entity[], raw: any[] }) => {
                    const relationMaps = createRelationMaps(this.getMetadata(), "treeEntity", entitiesAndScalars.raw);
                    buildParentEntityTree(this.getMetadata(), entity, entitiesAndScalars.entities, relationMaps);
                    return entity;
                });
        },

        countAncestors(entity: Entity): Promise<number> {
            return this
                .createAncestorsQueryBuilder("treeEntity", "treeClosure", entity)
                .getCount();
        },

        createAncestorsQueryBuilder(alias: string, closureTableAlias: string, entity: Entity): SelectQueryBuilder<Entity> {

            // create shortcuts for better readability
            // const escape = (alias: string) => this.manager.connection.driver.escape(alias);

            if (this.getMetadata().treeType === "closure-table") {
                const joinCondition = this.getMetadata().closureJunctionTable.ancestorColumns.map((column: ColumnMetadata) => {
                    return closureTableAlias + "." + column.propertyPath + " = " + alias + "." + column.referencedColumn!.propertyPath;
                }).join(" AND ");

                const parameters: ObjectLiteral = {};
                const whereCondition = this.getMetadata().closureJunctionTable.descendantColumns.map((column: ColumnMetadata) => {
                    parameters[column.referencedColumn!.propertyName] = column.referencedColumn!.getEntityValue(entity);
                    return closureTableAlias + "." + column.propertyPath + " = :" + column.referencedColumn!.propertyName;
                }).join(" AND ");

                return this
                    .createQueryBuilder(alias)
                    .innerJoin(this.getMetadata().closureJunctionTable.tableName, closureTableAlias, joinCondition)
                    .where(whereCondition)
                    .setParameters(parameters);

            } else if (this.getMetadata().treeType === "nested-set") {

                const joinCondition = "joined." + this.getMetadata().nestedSetLeftColumn!.propertyPath + " BETWEEN " +
                    alias + "." + this.getMetadata().nestedSetLeftColumn!.propertyPath + " AND " + alias + "." + this.getMetadata().nestedSetRightColumn!.propertyPath;
                const parameters: ObjectLiteral = {};
                const whereCondition = this.getMetadata().treeParentRelation!.joinColumns.map((joinColumn: ColumnMetadata) => {
                    const parameterName = joinColumn.referencedColumn!.propertyPath.replace(".", "_");
                    parameters[parameterName] = joinColumn.referencedColumn!.getEntityValue(entity);
                    return "joined." + joinColumn.referencedColumn!.propertyPath + " = :" + parameterName;
                }).join(" AND ");

                return this
                    .createQueryBuilder(alias)
                    .innerJoin(this.getMetadata().targetName, "joined", joinCondition)
                    .where(whereCondition, parameters);


            } else if (this.getMetadata().treeType === "materialized-path") {
                // example: SELECT * FROM category category WHERE (SELECT mpath FROM `category` WHERE id = 2) LIKE CONCAT(category.mpath, '%');
                return this
                    .createQueryBuilder(alias)
                    .where((qb: SelectQueryBuilder<any>) => {
                        const subQuery = qb.subQuery()
                            .select(`${this.getMetadata().targetName}.${this.getMetadata().materializedPathColumn!.propertyPath}`, "path")
                            .from(this.getMetadata().target, this.getMetadata().targetName)
                            .whereInIds(this.getMetadata().getEntityIdMap(entity));

                        qb.setNativeParameters(subQuery.expressionMap.nativeParameters);
                        if (this.manager.connection.driver instanceof AbstractSqliteDriver) {
                            return `${subQuery.getQuery()} LIKE ${alias}.${this.getMetadata().materializedPathColumn!.propertyPath} || '%'`;

                        } else {
                            return `${subQuery.getQuery()} LIKE CONCAT(${alias}.${this.getMetadata().materializedPathColumn!.propertyPath}, '%')`;
                        }
                    });
            }

            throw new Error(`Supported only in tree entities`);
        },

        /**
         * Moves entity to the children of then given entity.
         *
         move(entity: Entity, to: Entity): Promise<void> {
            return Promise.resolve();
        } */

    } as TreeRepository<Entity>;
}
