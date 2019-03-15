import {Connection, ObjectLiteral, SelectQueryBuilder} from "../";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {RelationMetadata} from "../metadata/RelationMetadata";

/**
 * Loads relation ids for the given entities.
 */
export class RelationIdLoader {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private connection: Connection) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Loads relation ids of the given entity or entities.
     */
    load(relation: RelationMetadata, entityOrEntities: ObjectLiteral|ObjectLiteral[], relatedEntityOrRelatedEntities?: ObjectLiteral|ObjectLiteral[]): Promise<any[]> {

        const entities = entityOrEntities instanceof Array ? entityOrEntities : [entityOrEntities];
        const relatedEntities = relatedEntityOrRelatedEntities instanceof Array ? relatedEntityOrRelatedEntities : (relatedEntityOrRelatedEntities ? [relatedEntityOrRelatedEntities] : undefined);

        // load relation ids depend of relation type
        if (relation.isManyToMany) {
            return this.loadForManyToMany(relation, entities, relatedEntities);

        } else if (relation.isManyToOne || relation.isOneToOneOwner) {
            return this.loadForManyToOneAndOneToOneOwner(relation, entities, relatedEntities);

        } else { // if (relation.isOneToMany || relation.isOneToOneNotOwner) {
            return this.loadForOneToManyAndOneToOneNotOwner(relation, entities, relatedEntities);
        }
    }

    /**
     * Loads relation ids of the given entities and groups them into the object with parent and children.
     *
     * todo: extract this method?
     */
    async loadManyToManyRelationIdsAndGroup<E1, E2>(
        relation: RelationMetadata,
        entitiesOrEntities: E1|E1[],
        relatedEntityOrEntities?: E2|E2[],
        queryBuilder?: SelectQueryBuilder<any>
    ): Promise<{ entity: E1, related?: E2|E2[] }[]> {

        // console.log("relation:", relation.propertyName);
        // console.log("entitiesOrEntities", entitiesOrEntities);
        const isMany = relation.isManyToMany || relation.isOneToMany;
        const entities: E1[] = entitiesOrEntities instanceof Array ? entitiesOrEntities : [entitiesOrEntities];

        if (!relatedEntityOrEntities) {
            relatedEntityOrEntities = await this.connection.relationLoader.load(relation, entitiesOrEntities, undefined, queryBuilder);
            if (!relatedEntityOrEntities.length)
                return entities.map(entity => ({ entity: entity, related: isMany ? [] : undefined }));
        }
        // const relationIds = await this.load(relation, relatedEntityOrEntities!, entitiesOrEntities);
        const relationIds = await this.load(relation, entitiesOrEntities, relatedEntityOrEntities);
        // console.log("entities", entities);
        // console.log("relatedEntityOrEntities", relatedEntityOrEntities);
        // console.log("relationIds", relationIds);

        const relatedEntities: E2[] = relatedEntityOrEntities instanceof Array ? relatedEntityOrEntities : [relatedEntityOrEntities!];

        let columns: ColumnMetadata[] = [], inverseColumns: ColumnMetadata[] = [];
        if (relation.isManyToManyOwner) {
            columns = relation.junctionEntityMetadata!.inverseColumns.map(column => column.referencedColumn!);
            inverseColumns = relation.junctionEntityMetadata!.ownerColumns.map(column => column.referencedColumn!);

        } else if (relation.isManyToManyNotOwner) {
            columns = relation.junctionEntityMetadata!.ownerColumns.map(column => column.referencedColumn!);
            inverseColumns = relation.junctionEntityMetadata!.inverseColumns.map(column => column.referencedColumn!);

        } else if (relation.isManyToOne || relation.isOneToOneOwner) {
            columns = relation.joinColumns.map(column => column.referencedColumn!);
            inverseColumns = relation.entityMetadata.primaryColumns;

        } else if (relation.isOneToMany || relation.isOneToOneNotOwner) {
            columns = relation.inverseRelation!.entityMetadata.primaryColumns;
            inverseColumns = relation.inverseRelation!.joinColumns.map(column => column.referencedColumn!);

        } else {

        }

        return entities.map(entity => {
            const group: { entity: E1, related?: E2|E2[] } = { entity: entity, related: isMany ? [] : undefined };

            const entityRelationIds = relationIds.filter(relationId => {
                return inverseColumns.every(column => {
                    return column.compareEntityValue(entity, relationId[column.entityMetadata.name + "_" + column.propertyAliasName]);
                });
            });
            if (!entityRelationIds.length)
                return group;

            relatedEntities.forEach(relatedEntity => {
                entityRelationIds.forEach(relationId => {
                    const relatedEntityMatched = columns.every(column => {
                        return column.compareEntityValue(relatedEntity, relationId[column.entityMetadata.name + "_" + relation.propertyPath.replace(".", "_") + "_" + column.propertyPath.replace(".", "_")]);
                    });
                    if (relatedEntityMatched) {
                        if (isMany) {
                            (group.related as E2[]).push(relatedEntity);
                        } else {
                            group.related = relatedEntity;
                        }
                    }
                });
            });
            return group;
        });
    }

    /**
     * Loads relation ids of the given entities and maps them into the given entity property.

    async loadManyToManyRelationIdsAndMap(
        relation: RelationMetadata,
        entityOrEntities: ObjectLiteral|ObjectLiteral[],
        mapToEntityOrEntities: ObjectLiteral|ObjectLiteral[],
        propertyName: string
    ): Promise<void> {

        const relationIds = await this.loadManyToManyRelationIds(relation, entityOrEntities, mapToEntityOrEntities);
        const mapToEntities = mapToEntityOrEntities instanceof Array ? mapToEntityOrEntities : [mapToEntityOrEntities];
        const junctionMetadata = relation.junctionEntityMetadata!;
        const mainAlias = junctionMetadata.name;
        const columns = relation.isOwning ? junctionMetadata.inverseColumns : junctionMetadata.ownerColumns;
        const inverseColumns = relation.isOwning ? junctionMetadata.ownerColumns : junctionMetadata.inverseColumns;

        mapToEntities.forEach(mapToEntity => {
            mapToEntity[propertyName] = [];
            relationIds.forEach(relationId => {
                const match = inverseColumns.every(column => {
                    return column.referencedColumn!.getEntityValue(mapToEntity) === relationId[mainAlias + "_" + column.propertyName];
                });
                if (match) {
                    if (columns.length === 1) {
                        mapToEntity[propertyName].push(relationId[mainAlias + "_" + columns[0].propertyName]);

                    } else {
                        const value = {};
                        columns.forEach(column => {
                            column.referencedColumn!.setEntityValue(value, relationId[mainAlias + "_" + column.propertyName]);
                        });
                        mapToEntity[propertyName].push(value);
                    }
                }
            });
        });
    }*/

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Loads relation ids for the many-to-many relation.
     */
    protected loadForManyToMany(relation: RelationMetadata, entities: ObjectLiteral[], relatedEntities?: ObjectLiteral[]) {

        const junctionMetadata = relation.junctionEntityMetadata!;
        const mainAlias = junctionMetadata.name;
        const columns = relation.isOwning ? junctionMetadata.ownerColumns : junctionMetadata.inverseColumns;
        const inverseColumns = relation.isOwning ? junctionMetadata.inverseColumns : junctionMetadata.ownerColumns;
        const qb = this.connection.createQueryBuilder();

        // select all columns from junction table
        columns.forEach(column => {
            const columnName = column.referencedColumn!.entityMetadata.name + "_" + column.referencedColumn!.propertyPath.replace(".", "_");
            qb.addSelect(mainAlias + "." + column.propertyPath, columnName);
        });
        inverseColumns.forEach(column => {
            const columnName = column.referencedColumn!.entityMetadata.name + "_" + relation.propertyPath.replace(".", "_") + "_" + column.referencedColumn!.propertyPath.replace(".", "_");
            qb.addSelect(mainAlias + "." + column.propertyPath, columnName);
        });

        // add conditions for the given entities
        let condition1 = "";
        if (columns.length === 1) {

            const values = entities.map(entity => columns[0].referencedColumn!.getEntityValue(entity));
            const areAllNumbers = values.every(value => typeof value === "number");

            if (areAllNumbers) {
                qb.where(`${mainAlias}.${columns[0].propertyPath} IN (${values.join(", ")})`);
            } else {
                qb.setParameter("values1", values);
                condition1 = mainAlias + "." + columns[0].propertyPath + " IN (:...values1)"; // todo: use ANY for postgres
            }

        } else {
            condition1 = "(" + entities.map((entity, entityIndex) => {
                return columns.map(column => {
                    const paramName = "entity1_" + entityIndex + "_" + column.propertyName;
                    qb.setParameter(paramName, column.referencedColumn!.getEntityValue(entity));
                    return mainAlias + "." + column.propertyPath + " = :" + paramName;
                }).join(" AND ");
            }).map(condition => "(" + condition + ")").join(" OR ") + ")";
        }

        // add conditions for the given inverse entities
        let condition2 = "";
        if (relatedEntities) {
            if (inverseColumns.length === 1) {
                const values = relatedEntities.map(entity => inverseColumns[0].referencedColumn!.getEntityValue(entity));
                const areAllNumbers = values.every(value => typeof value === "number");

                if (areAllNumbers) {
                    qb.where(`${mainAlias}.${columns[0].propertyPath} IN (${values.join(", ")})`);
                } else {
                    qb.setParameter("values2", values);
                    condition2 = mainAlias + "." + inverseColumns[0].propertyPath + " IN (:...values2)"; // todo: use ANY for postgres
                }

            } else {
                condition2 = "(" + relatedEntities.map((entity, entityIndex) => {
                    return inverseColumns.map(column => {
                        const paramName = "entity2_" + entityIndex + "_" + column.propertyName;
                        qb.setParameter(paramName, column.referencedColumn!.getEntityValue(entity));
                        return mainAlias + "." + column.propertyPath + " = :" + paramName;
                    }).join(" AND ");
                }).map(condition => "(" + condition + ")").join(" OR ") + ")";
            }
        }

        // qb.from(junctionMetadata.target, mainAlias)
        //     .where(condition1 + (condition2 ? " AND " + condition2 : ""));
        //
        // // execute query
        // const { values1, values2 } = qb.getParameters();
        // console.log(`I can do it`, { values1, values2 });
        // if (inverseColumns.length === 1 &&
        //     columns.length === 1 &&
        //     this.connection.driver instanceof SqliteDriver &&
        //     (values1.length + values2.length) > 500 &&
        //     values1.length === values2.length) {
        //     console.log(`I can do it`);
        //     return qb.getRawMany();
        //
        // } else {
        //     return qb.getRawMany();
        // }

        // execute query
        return qb
            .from(junctionMetadata.target, mainAlias)
            .where(condition1 + (condition2 ? " AND " + condition2 : ""))
            .getRawMany();
    }

    /**
     * Loads relation ids for the many-to-one and one-to-one owner relations.
     */
    protected loadForManyToOneAndOneToOneOwner(relation: RelationMetadata, entities: ObjectLiteral[], relatedEntities?: ObjectLiteral[]) {
        const mainAlias = relation.entityMetadata.targetName;

        // console.log("entitiesx", entities);
        // console.log("relatedEntitiesx", relatedEntities);
        const hasAllJoinColumnsInEntity = relation.joinColumns.every(joinColumn => {
            return !!relation.entityMetadata.nonVirtualColumns.find(column => column === joinColumn);
        });
        if (relatedEntities && hasAllJoinColumnsInEntity) {
            let relationIdMaps: ObjectLiteral[] = [];
            entities.forEach(entity => {
                let relationIdMap: ObjectLiteral = {};
                relation.entityMetadata.primaryColumns.forEach(primaryColumn => {
                    const key = primaryColumn.entityMetadata.name + "_" + primaryColumn.propertyPath.replace(".", "_");
                    relationIdMap[key] = primaryColumn.getEntityValue(entity);
                });

                relatedEntities.forEach(relatedEntity => {
                    relation.joinColumns.forEach(joinColumn => {
                        const entityColumnValue = joinColumn.getEntityValue(entity);
                        const relatedEntityColumnValue = joinColumn.referencedColumn!.getEntityValue(relatedEntity);
                        if (entityColumnValue === undefined || relatedEntityColumnValue === undefined)
                            return;

                        if (entityColumnValue === relatedEntityColumnValue) {
                            const key = joinColumn.referencedColumn!.entityMetadata.name + "_" + relation.propertyPath.replace(".", "_") + "_" + joinColumn.referencedColumn!.propertyPath.replace(".", "_");
                            relationIdMap[key] = relatedEntityColumnValue;
                        }
                    });
                });
                if (Object.keys(relationIdMap).length === relation.entityMetadata.primaryColumns.length + relation.joinColumns.length) {
                    relationIdMaps.push(relationIdMap);
                }
            });
            // console.log("relationIdMap", relationIdMaps);
            // console.log("entities.length", entities.length);
            if (relationIdMaps.length === entities.length)
                return Promise.resolve(relationIdMaps);
        }

        // select all columns we need
        const qb = this.connection.createQueryBuilder();
        relation.entityMetadata.primaryColumns.forEach(primaryColumn => {
            const columnName = primaryColumn.entityMetadata.name + "_" + primaryColumn.propertyPath.replace(".", "_");
            qb.addSelect(mainAlias + "." + primaryColumn.propertyPath, columnName);
        });
        relation.joinColumns.forEach(column => {
            const columnName = column.referencedColumn!.entityMetadata.name + "_" + relation.propertyPath.replace(".", "_") + "_" + column.referencedColumn!.propertyPath.replace(".", "_");
            qb.addSelect(mainAlias + "." + column.propertyPath, columnName);
        });

        // add condition for entities
        let condition: string = "";
        if (relation.entityMetadata.primaryColumns.length === 1) {

            const values = entities.map(entity => relation.entityMetadata.primaryColumns[0].getEntityValue(entity));
            const areAllNumbers = values.every(value => typeof value === "number");

            if (areAllNumbers) {
                condition = `${mainAlias}.${relation.entityMetadata.primaryColumns[0].propertyPath} IN (${values.join(", ")})`;
            } else {
                qb.setParameter("values", values);
                condition = mainAlias + "." + relation.entityMetadata.primaryColumns[0].propertyPath + " IN (:...values)"; // todo: use ANY for postgres
            }

        } else {
            condition = entities.map((entity, entityIndex) => {
                return relation.entityMetadata.primaryColumns.map((column, columnIndex) => {
                    const paramName = "entity" + entityIndex + "_" + columnIndex;
                    qb.setParameter(paramName, column.getEntityValue(entity));
                    return mainAlias + "." + column.propertyPath + " = :" + paramName;
                }).join(" AND ");
            }).map(condition => "(" + condition + ")").join(" OR ");
        }

        // execute query
        return qb.from(relation.entityMetadata.target, mainAlias)
            .where(condition)
            .getRawMany();
    }

    /**
     * Loads relation ids for the one-to-many and one-to-one not owner relations.
     */
    protected loadForOneToManyAndOneToOneNotOwner(relation: RelationMetadata, entities: ObjectLiteral[], relatedEntities?: ObjectLiteral[]) {
        relation = relation.inverseRelation!;

        if (relation.entityMetadata.primaryColumns.length === relation.joinColumns.length) {
            const sameReferencedColumns = relation.entityMetadata.primaryColumns.every(column => {
                return relation.joinColumns.indexOf(column) !== -1;
            });
            if (sameReferencedColumns) {
                return Promise.resolve(entities.map(entity => {
                    const result: ObjectLiteral = {};
                    relation.joinColumns.forEach(function (joinColumn) {
                        const value = joinColumn.referencedColumn!.getEntityValue(entity);
                        const joinColumnName = joinColumn.referencedColumn!.entityMetadata.name + "_" + joinColumn.referencedColumn!.propertyPath.replace(".", "_");
                        const primaryColumnName = joinColumn.entityMetadata.name + "_" + relation.inverseRelation!.propertyPath.replace(".", "_") + "_" + joinColumn.propertyPath.replace(".", "_");
                        result[joinColumnName] = value;
                        result[primaryColumnName] = value;
                    });
                    return result;
                }));
            }
        }

        const mainAlias = relation.entityMetadata.targetName;

        // select all columns we need
        const qb = this.connection.createQueryBuilder();
        relation.entityMetadata.primaryColumns.forEach(primaryColumn => {
            const columnName = primaryColumn.entityMetadata.name + "_" + relation.inverseRelation!.propertyPath.replace(".", "_") + "_" + primaryColumn.propertyPath.replace(".", "_");
            qb.addSelect(mainAlias + "." + primaryColumn.propertyPath, columnName);
        });
        relation.joinColumns.forEach(column => {
            const columnName = column.referencedColumn!.entityMetadata.name + "_" + column.referencedColumn!.propertyPath.replace(".", "_");
            qb.addSelect(mainAlias + "." + column.propertyPath, columnName);
        });

        // add condition for entities
        let condition: string = "";
        if (relation.joinColumns.length === 1) {
            const values = entities.map(entity => relation.joinColumns[0].referencedColumn!.getEntityValue(entity));
            const areAllNumbers = values.every(value => typeof value === "number");

            if (areAllNumbers) {
                condition = `${mainAlias}.${relation.joinColumns[0].propertyPath} IN (${values.join(", ")})`;
            } else {
                qb.setParameter("values", values);
                condition = mainAlias + "." + relation.joinColumns[0].propertyPath + " IN (:...values)"; // todo: use ANY for postgres
            }

        } else {
            condition = entities.map((entity, entityIndex) => {
                return relation.joinColumns.map((joinColumn, joinColumnIndex) => {
                    const paramName = "entity" + entityIndex + "_" + joinColumnIndex;
                    qb.setParameter(paramName, joinColumn.referencedColumn!.getEntityValue(entity));
                    return mainAlias + "." + joinColumn.propertyPath + " = :" + paramName;
                }).join(" AND ");
            }).map(condition => "(" + condition + ")").join(" OR ");
        }

        // execute query
        return qb.from(relation.entityMetadata.target, mainAlias)
            .where(condition)
            .getRawMany();
    }

}