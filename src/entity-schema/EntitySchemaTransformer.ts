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
import {EmbeddedMetadataArgs} from "../metadata-args/EmbeddedMetadataArgs";

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
     */
    transform(schemas: EntitySchema<any>[]): MetadataArgsStorage {
        const metadataArgsStorage = new MetadataArgsStorage();

        schemas.forEach(entitySchema => {
            const options = entitySchema.options;

            // add table metadata args from the schema
            const tableMetadata: TableMetadataArgs = {
                target: options.target || options.name,
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
            Object.keys(options.columns).forEach(columnName => {
                const column = options.columns[columnName]!;
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
                    target: options.target || options.name,
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
                        target: options.target || options.name,
                        propertyName: columnName,
                        strategy: typeof column.generated === "string" ? column.generated : "increment"
                    };
                    metadataArgsStorage.generations.push(generationArgs);
                }

                if (column.unique)
                    metadataArgsStorage.uniques.push({ target: options.target || options.name, columns: [columnName] });
            });

            // add relation metadata args from the schema
            if (options.relations) {
                Object.keys(options.relations).forEach(relationName => {
                    const relationSchema = options.relations![relationName]!;
                    const relation: RelationMetadataArgs = {
                        target: options.target || options.name,
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
                            primary: relationSchema.primary,
                            persistence: relationSchema.persistence,
                            orphanedRowAction: relationSchema.orphanedRowAction
                        }
                    };

                    metadataArgsStorage.relations.push(relation);

                    // add join column
                    if (relationSchema.joinColumn) {
                        if (typeof relationSchema.joinColumn === "boolean") {
                            const joinColumn: JoinColumnMetadataArgs = {
                                target: options.target || options.name,
                                propertyName: relationName
                            };
                            metadataArgsStorage.joinColumns.push(joinColumn);
                        } else {
                            const joinColumnsOptions = Array.isArray(relationSchema.joinColumn) ? relationSchema.joinColumn : [relationSchema.joinColumn];

                            for (const joinColumnOption of joinColumnsOptions) {
                                const joinColumn: JoinColumnMetadataArgs = {
                                    target: options.target || options.name,
                                    propertyName: relationName,
                                    name: joinColumnOption.name,
                                    referencedColumnName: joinColumnOption.referencedColumnName
                                };
                                metadataArgsStorage.joinColumns.push(joinColumn);
                            }
                        }
                    }

                    // add join table
                    if (relationSchema.joinTable) {
                        if (typeof relationSchema.joinTable === "boolean") {
                            const joinTable: JoinTableMetadataArgs = {
                                target: options.target || options.name,
                                propertyName: relationName
                            };
                            metadataArgsStorage.joinTables.push(joinTable);
                        } else {
                            const joinTable: JoinTableMetadataArgs = {
                                target: options.target || options.name,
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

            // add embedded metadata args from the schema
            if (options.embeddeds) {
                Object.keys(options.embeddeds).forEach(embeddedName => {
                    const embeddedSchema = options.embeddeds![embeddedName]!;
                    const embedded: EmbeddedMetadataArgs = {
                        target: options.target || options.name,
                        propertyName: embeddedName,
                        isArray: embeddedSchema.isArray === true,
                        prefix: embeddedSchema.prefix !== undefined ? embeddedSchema.prefix : undefined,
                        type: embeddedSchema.type
                    };
                    metadataArgsStorage.embeddeds.push(embedded);
                });
            }

            // add index metadata args from the schema
            if (options.indices) {
                options.indices.forEach(index => {
                    const indexAgrs: IndexMetadataArgs = {
                        target: options.target || options.name,
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
                        target: options.target || options.name,
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
                        target: options.target || options.name,
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
                        target: options.target || options.name,
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
