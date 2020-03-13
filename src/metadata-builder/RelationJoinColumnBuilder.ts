import {MysqlDriver} from "../driver/mysql/MysqlDriver";
import {ColumnMetadata} from "../metadata/ColumnMetadata";
import {UniqueMetadata} from "../metadata/UniqueMetadata";
import {ForeignKeyMetadata} from "../metadata/ForeignKeyMetadata";
import {RelationMetadata} from "../metadata/RelationMetadata";
import {JoinColumnMetadataArgs} from "../metadata-args/JoinColumnMetadataArgs";
import {Connection} from "../connection/Connection";
import {OracleDriver} from "../driver/oracle/OracleDriver";
import {AuroraDataApiDriver} from "../driver/aurora-data-api/AuroraDataApiDriver";

/**
 * Builds join column for the many-to-one and one-to-one owner relations.
 *
 * Cases it should cover:
 * 1. when join column is set with custom name and without referenced column name
 * we need automatically set referenced column name - primary ids by default
 * @JoinColumn({ name: "custom_name" })
 *
 * 2. when join column is set with only referenced column name
 * we need automatically set join column name - relation name + referenced column name
 * @JoinColumn({ referencedColumnName: "title" })
 *
 * 3. when join column is set without both referenced column name and join column name
 * we need to automatically set both of them
 * @JoinColumn()
 *
 * 4. when join column is not set at all (as in case of @ManyToOne relation)
 * we need to create join column for it with proper referenced column name and join column name
 *
 * 5. when multiple join columns set none of referencedColumnName and name can be optional
 * both options are required
 * @JoinColumn([
 *      { name: "category_title", referencedColumnName: "type" },
 *      { name: "category_title", referencedColumnName: "name" },
 * ])
 *
 * Since for many-to-one relations having JoinColumn decorator is not required,
 * we need to go thought each many-to-one relation without join column decorator set
 * and create join column metadata args for them.
 */
export class RelationJoinColumnBuilder {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(private connection: Connection) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Builds a foreign key of the many-to-one or one-to-one owner relations.
     */
    build(joinColumns: JoinColumnMetadataArgs[], relation: RelationMetadata): {
      foreignKey: ForeignKeyMetadata|undefined,
      uniqueConstraint: UniqueMetadata|undefined,
    } {
        const referencedColumns = this.collectReferencedColumns(joinColumns, relation);
        if (!referencedColumns.length)
            return { foreignKey: undefined, uniqueConstraint: undefined }; // this case is possible only for one-to-one non owning side

        const columns = this.collectColumns(joinColumns, relation, referencedColumns);
        const foreignKey = new ForeignKeyMetadata({
            entityMetadata: relation.entityMetadata,
            referencedEntityMetadata: relation.inverseEntityMetadata,
            namingStrategy: this.connection.namingStrategy,
            columns: columns,
            referencedColumns: referencedColumns,
            onDelete: relation.onDelete,
            onUpdate: relation.onUpdate,
            deferrable: relation.deferrable,
        });

        // Oracle does not allow both primary and unique constraints on the same column
        if (this.connection.driver instanceof OracleDriver && columns.every(column => column.isPrimary))
            return { foreignKey, uniqueConstraint: undefined };

        // CockroachDB requires UNIQUE constraints on referenced columns
        if (referencedColumns.length > 0 && relation.isOneToOne) {
            const uniqueConstraint = new UniqueMetadata({
                entityMetadata: relation.entityMetadata,
                columns: foreignKey.columns,
                args: {
                    name: this.connection.namingStrategy.relationConstraintName(relation.entityMetadata.tablePath, foreignKey.columns.map(c => c.databaseName)),
                    target: relation.entityMetadata.target,
                }
            });
            uniqueConstraint.build(this.connection.namingStrategy);
            return {foreignKey, uniqueConstraint};
        }

        return { foreignKey, uniqueConstraint: undefined };
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Collects referenced columns from the given join column args.
     */
    protected collectReferencedColumns(joinColumns: JoinColumnMetadataArgs[], relation: RelationMetadata): ColumnMetadata[] {
        const hasAnyReferencedColumnName = joinColumns.find(joinColumnArgs => !!joinColumnArgs.referencedColumnName);
        const manyToOneWithoutJoinColumn = joinColumns.length === 0 && relation.isManyToOne;
        const hasJoinColumnWithoutAnyReferencedColumnName = joinColumns.length > 0 && !hasAnyReferencedColumnName;

        if (manyToOneWithoutJoinColumn || hasJoinColumnWithoutAnyReferencedColumnName) { // covers case3 and case1
            return relation.inverseEntityMetadata.primaryColumns;

        } else { // cases with referenced columns defined
            return joinColumns.map(joinColumn => {
                const referencedColumn = relation.inverseEntityMetadata.ownColumns.find(column => column.propertyName === joinColumn.referencedColumnName); // todo: can we also search in relations?
                if (!referencedColumn)
                    throw new Error(`Referenced column ${joinColumn.referencedColumnName} was not found in entity ${relation.inverseEntityMetadata.name}`);

                return referencedColumn;
            });
        }
    }

    /**
     * Collects columns from the given join column args.
     */
    private collectColumns(joinColumns: JoinColumnMetadataArgs[], relation: RelationMetadata, referencedColumns: ColumnMetadata[]): ColumnMetadata[] {
        return referencedColumns.map(referencedColumn => {

            // in the case if relation has join column with only name set we need this check
            const joinColumnMetadataArg = joinColumns.find(joinColumn => {
                return (!joinColumn.referencedColumnName || joinColumn.referencedColumnName === referencedColumn.propertyName) &&
                    !!joinColumn.name;
            });
            const joinColumnName = joinColumnMetadataArg ? joinColumnMetadataArg.name : this.connection.namingStrategy.joinColumnName(relation.propertyName, referencedColumn.propertyName);

            let relationalColumn = relation.entityMetadata.ownColumns.find(column => column.databaseName === joinColumnName);
            if (!relationalColumn) {
                relationalColumn = new ColumnMetadata({
                    connection: this.connection,
                    entityMetadata: relation.entityMetadata,
                    args: {
                        target: "",
                        mode: "virtual",
                        propertyName: relation.propertyName,
                        options: {
                            name: joinColumnName,
                            type: referencedColumn.type,
                            length: !referencedColumn.length
                                        && (this.connection.driver instanceof MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver)
                                        && (referencedColumn.generationStrategy === "uuid" || referencedColumn.type === "uuid")
                                    ? "36"
                                    : referencedColumn.length, // fix https://github.com/typeorm/typeorm/issues/3604
                            width: referencedColumn.width,
                            charset: referencedColumn.charset,
                            collation: referencedColumn.collation,
                            precision: referencedColumn.precision,
                            scale: referencedColumn.scale,
                            zerofill: referencedColumn.zerofill,
                            unsigned: referencedColumn.unsigned,
                            comment: referencedColumn.comment,
                            nullable: relation.isNullable
                        }
                    }
                });
                relation.isNullable = relationalColumn.isNullable;
                relation.entityMetadata.registerColumn(relationalColumn);
            }
            relationalColumn.referencedColumn = referencedColumn; // its important to set it here because we need to set referenced column for user defined join column
            relationalColumn.type = referencedColumn.type; // also since types of relational column and join column must be equal we override user defined column type
            relationalColumn.relationMetadata = relation;
            relationalColumn.build(this.connection);
            return relationalColumn;
        });
    }
}
