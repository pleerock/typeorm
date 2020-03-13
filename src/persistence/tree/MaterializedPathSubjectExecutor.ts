import {Subject} from "../Subject";
import {QueryRunner} from "../../query-runner/QueryRunner";

/**
 * Executes subject operations for materialized-path tree entities.
 */
export class MaterializedPathSubjectExecutor {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(protected queryRunner: QueryRunner) {
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Executes operations when subject is being inserted.
     */
    async insert(subject: Subject): Promise<void> {

        let parent = subject.metadata.treeParentRelation!.getEntityValue(subject.entity!); // if entity was attached via parent
        if (!parent && subject.parentSubject && subject.parentSubject.entity) // if entity was attached via children
            parent = subject.parentSubject.insertedValueSet ? subject.parentSubject.insertedValueSet : subject.parentSubject.entity;

        const parentId = subject.metadata.getEntityIdMap(parent);

        let parentPath: string = "";
        if (parentId) {
            parentPath = await this.queryRunner.manager
                .createQueryBuilder()
                .select(subject.metadata.targetName + "." + subject.metadata.materializedPathColumn!.propertyPath, "path")
                .from(subject.metadata.target, subject.metadata.targetName)
                .whereInIds(parentId)
                .getRawOne()
                .then(result => result ? result["path"] : undefined);
        }

        const insertedEntityId = subject.metadata.treeParentRelation!.joinColumns.map(joinColumn => {
            return joinColumn.referencedColumn!.getEntityValue(subject.insertedValueSet!);
        }).join("_");

        await this.queryRunner.manager
            .createQueryBuilder()
            .update(subject.metadata.target)
            .set({
                [subject.metadata.materializedPathColumn!.propertyPath]: parentPath + insertedEntityId + "."
            } as any)
            .where(subject.identifier!)
            .callObservers(false)
            .callListeners(false)
            .execute();
    }

}
