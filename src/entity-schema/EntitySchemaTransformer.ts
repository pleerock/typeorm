import {EntitySchema} from "./EntitySchema";
import {MetadataArgsStorage} from "../metadata-args/MetadataArgsStorage";
import {TableMetadataArgs} from "../metadata-args/TableMetadataArgs";
import {ColumnMetadataArgs} from "../metadata-args/ColumnMetadataArgs";
import {IndexMetadataArgs} from "../metadata-args/IndexMetadataArgs";
import {RelationMetadataArgs} from "../metadata-args/RelationMetadataArgs";
import {JoinColumnMetadataArgs} from "../metadata-args/JoinColumnMetadataArgs";
import {JoinTableMetadataArgs} from "../metadata-args/JoinTableMetadataArgs";
import {JoinTableOptions} from "../decorator/options/JoinTableOptions";
import {JoinTableMultipleColumnsOptions} from "../decorator/options/JoinTableMultipleColumnsOptions";
import {ColumnMode} from "../metadata-args/types/ColumnMode";
import {GeneratedMetadataArgs} from "../metadata-args/GeneratedMetadataArgs";
import {UniqueMetadataArgs} from "../metadata-args/UniqueMetadataArgs";
import {CheckMetadataArgs} from "../metadata-args/CheckMetadataArgs";
import {ExclusionMetadataArgs} from "../metadata-args/ExclusionMetadataArgs";
import {EntitySchemaColumnOptions} from "./EntitySchemaColumnOptions";
import {Connection} from "..";

/**
 * Transforms entity schema into metadata args storage.
 * The result will be just like entities read from decorators.
 */
export class EntitySchemaTransformer {

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Transforms entity schema into new metadata args storage object.
     *
     * todo: we need to add embeddeds support
     */
    transform(connection: Connection, schemas: EntitySchema<any>[]): MetadataArgsStorage {
        const metadataArgsStorage = new MetadataArgsStorage();

        // todo: to support this functionality in ORM we need ORM to support schemas with custom function that finds a
        // todo: a target and targetName / entityName
        const mappedRelationTargets = connection.options.mappedEntitySchemaProperties || [];

        schemas.forEach(entitySchema => {
            const options = entitySchema.options;
            if (!options.name)
                throw new Error(`EntitySchema missing "name" property.`);
            const optionsName = options.name;

            const columns = entitySchema.options.columns || {};
            const relations = entitySchema.options.relations || {};

            if (entitySchema.options.projection) {
                for (let propertyName in entitySchema.options.projection) {
                    if (entitySchema.options.projection.hasOwnProperty(propertyName)) {
                        const schemaOptions = (entitySchema.options.projection as any)[propertyName];

                        // if there is a type - it means it is a column
                        if (schemaOptions.type !== undefined) {
                            columns[propertyName] = schemaOptions as EntitySchemaColumnOptions;
                        }

                        // if there is a relation - it means it is a relation
                        if (schemaOptions.relation !== undefined) {
                            let relation = schemaOptions as any;
                            let target = relation.with;

                            if (!target) {
                                const mappedRelationTarget = mappedRelationTargets.find(mappedTarget => {
                                    return mappedTarget.model === optionsName && mappedTarget.property === propertyName;
                                });
                                if (mappedRelationTarget && !relation.with) {
                                    target = mappedRelationTarget.target;
                                }
                            }
                            if (target) {
                                relations[propertyName] = {
                                    target: target,
                                    type: relation.relation,
                                    inverseSide: relation.inverse,
                                    joinColumn: relation.joinColumnOptions ? relation.joinColumnOptions : relation.owner,
                                    joinTable: relation.joinTableOptions ? relation.joinTableOptions : relation.owner,
                                    ...relation,
                                };
                            }
                        }
                    }
                }
            }

            // add table metadata args from the schema
            const tableMetadata: TableMetadataArgs = {
                target: options.target || optionsName,
                name: options.tableName,
                database: options.database,
                schema: options.schema,
                type: options.type || "regular",
                orderBy: options.orderBy,
                synchronize: options.synchronize,
                expression: options.expression
            };
            metadataArgsStorage.tables.push(tableMetadata);

            // add columns metadata args from the schema
            Object.keys(columns).forEach(columnName => {
                const column = columns[columnName]!;
                let mode: ColumnMode = "regular";
                if (column.createDate)
                    mode = "createDate";
                if (column.updateDate)
                    mode = "updateDate";
                if (column.deleteDate)
                    mode = "deleteDate";
                if (column.version)
                    mode = "version";
                if (column.treeChildrenCount)
                    mode = "treeChildrenCount";
                if (column.treeLevel)
                    mode = "treeLevel";
                if (column.objectId)
                    mode = "objectId";

                const columnAgrs: ColumnMetadataArgs = {
                    target: options.target || optionsName,
                    mode: mode,
                    propertyName: columnName,
                    options: {
                        type: column.type,
                        name: column.objectId ? "_id" : column.name,
                        length: column.length,
                        width: column.width,
                        nullable: column.nullable,
                        readonly: column.readonly,
                        update: column.update,
                        select: column.select,
                        insert: column.insert,
                        primary: column.primary,
                        unique: column.unique,
                        comment: column.comment,
                        default: column.default,
                        onUpdate: column.onUpdate,
                        precision: column.precision,
                        scale: column.scale,
                        zerofill: column.zerofill,
                        unsigned: column.unsigned,
                        charset: column.charset,
                        collation: column.collation,
                        enum: column.enum,
                        asExpression: column.asExpression,
                        generatedType: column.generatedType,
                        hstoreType: column.hstoreType,
                        array: column.array,
                        transformer: column.transformer,
                        spatialFeatureType: column.spatialFeatureType,
                        srid: column.srid
                    }
                };
                metadataArgsStorage.columns.push(columnAgrs);

                if (column.generated) {
                    const generationArgs: GeneratedMetadataArgs = {
                        target: options.target || optionsName,
                        propertyName: columnName,
                        strategy: typeof column.generated === "string" ? column.generated : "increment"
                    };
                    metadataArgsStorage.generations.push(generationArgs);
                }

                if (column.unique)
                    metadataArgsStorage.uniques.push({ target: options.target || optionsName, columns: [columnName] });
            });

            // add relation metadata args from the schema
            if (relations) {
                Object.keys(relations).forEach(relationName => {
                    const relationSchema = relations[relationName]!;
                    const relation: RelationMetadataArgs = {
                        target: options.target || optionsName,
                        propertyName: relationName,
                        relationType: relationSchema.type,
                        isLazy: relationSchema.lazy || false,
                        type: relationSchema.target,
                        inverseSideProperty: relationSchema.inverseSide,
                        isTreeParent: relationSchema.treeParent,
                        isTreeChildren: relationSchema.treeChildren,
                        options: {
                            eager: relationSchema.eager || false,
                            cascade: relationSchema.cascade,
                            nullable: relationSchema.nullable,
                            onDelete: relationSchema.onDelete,
                            onUpdate: relationSchema.onUpdate,
                            deferrable: relationSchema.deferrable,
                            persistence: relationSchema.persistence
                        }
                    };

                    metadataArgsStorage.relations.push(relation);

                    // add join column
                    if (relationSchema.joinColumn) {
                        if (typeof relationSchema.joinColumn === "boolean") {
                            const joinColumn: JoinColumnMetadataArgs = {
                                target: options.target || optionsName,
                                propertyName: relationName
                            };
                            metadataArgsStorage.joinColumns.push(joinColumn);
                        } else {
                            const joinColumn: JoinColumnMetadataArgs = {
                                target: options.target || optionsName,
                                propertyName: relationName,
                                name: relationSchema.joinColumn.name,
                                referencedColumnName: relationSchema.joinColumn.referencedColumnName
                            };
                            metadataArgsStorage.joinColumns.push(joinColumn);
                        }
                    }

                    // add join table
                    if (relationSchema.joinTable) {
                        if (typeof relationSchema.joinTable === "boolean") {
                            const joinTable: JoinTableMetadataArgs = {
                                target: options.target || optionsName,
                                propertyName: relationName
                            };
                            metadataArgsStorage.joinTables.push(joinTable);
                        } else {
                            const joinTable: JoinTableMetadataArgs = {
                                target: options.target || optionsName,
                                propertyName: relationName,
                                name: relationSchema.joinTable.name,
                                database: relationSchema.joinTable.database,
                                schema: relationSchema.joinTable.schema,
                                joinColumns: ((relationSchema.joinTable as JoinTableOptions).joinColumn ? [(relationSchema.joinTable as JoinTableOptions).joinColumn!] : (relationSchema.joinTable as JoinTableMultipleColumnsOptions).joinColumns) as any,
                                inverseJoinColumns: ((relationSchema.joinTable as JoinTableOptions).inverseJoinColumn ? [(relationSchema.joinTable as JoinTableOptions).inverseJoinColumn!] : (relationSchema.joinTable as JoinTableMultipleColumnsOptions).inverseJoinColumns) as any,
                            };
                            metadataArgsStorage.joinTables.push(joinTable);
                        }
                    }
                });
            }

            // add index metadata args from the schema
            if (options.indices) {
                options.indices.forEach(index => {
                    const indexAgrs: IndexMetadataArgs = {
                        target: options.target || optionsName,
                        name: index.name,
                        unique: index.unique === true ? true : false,
                        spatial: index.spatial === true ? true : false,
                        fulltext: index.fulltext === true ? true : false,
                        parser: index.parser,
                        synchronize: index.synchronize === false ? false : true,
                        where: index.where,
                        sparse: index.sparse,
                        columns: index.columns
                    };
                    metadataArgsStorage.indices.push(indexAgrs);
                });
            }

            // add unique metadata args from the schema
            if (options.uniques) {
                options.uniques.forEach(unique => {
                    const uniqueAgrs: UniqueMetadataArgs = {
                        target: options.target || optionsName,
                        name: unique.name,
                        columns: unique.columns
                    };
                    metadataArgsStorage.uniques.push(uniqueAgrs);
                });
            }

            // add check metadata args from the schema
            if (options.checks) {
                options.checks.forEach(check => {
                    const checkAgrs: CheckMetadataArgs = {
                        target: options.target || optionsName,
                        name: check.name,
                        expression: check.expression
                    };
                    metadataArgsStorage.checks.push(checkAgrs);
                });
            }

            // add exclusion metadata args from the schema
            if (options.exclusions) {
                options.exclusions.forEach(exclusion => {
                    const exclusionArgs: ExclusionMetadataArgs = {
                        target: options.target || optionsName,
                        name: exclusion.name,
                        expression: exclusion.expression
                    };
                    metadataArgsStorage.exclusions.push(exclusionArgs);
                });
            }

        });

        return metadataArgsStorage;
    }
}
