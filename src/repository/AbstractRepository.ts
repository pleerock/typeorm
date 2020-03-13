import {ObjectLiteral} from "../common/ObjectLiteral";
import {EntityManager} from "../entity-manager/EntityManager";
import {Repository} from "./Repository";
import {TreeRepository} from "./TreeRepository";
import {ObjectType} from "../common/ObjectType";
import {CustomRepositoryDoesNotHaveEntityError} from "../error/CustomRepositoryDoesNotHaveEntityError";
import {getMetadataArgsStorage} from "../index";
import {CustomRepositoryNotFoundError} from "../error/CustomRepositoryNotFoundError";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {EntitySchema} from "../entity-schema/EntitySchema";

/**
 * Provides abstract class for custom repositories that do not inherit from original orm Repository.
 * Contains all most-necessary methods to simplify code in the custom repository.
 * All methods are protected thus not exposed and it allows to create encapsulated custom repository.
 *
 * @deprecated
 */
export class AbstractRepository<Entity extends ObjectLiteral> {

    // -------------------------------------------------------------------------
    // Protected Methods Set Dynamically
    // -------------------------------------------------------------------------

    /**
     * Gets entity manager that allows to perform repository operations with any entity.
     */
    protected manager: EntityManager;

    // -------------------------------------------------------------------------
    // Protected Accessors
    // -------------------------------------------------------------------------

    /**
     * Gets the original ORM repository for the entity that is managed by this repository.
     * If current repository does not manage any entity, then exception will be thrown.
     */
    protected get repository(): Repository<Entity> {
        const target = this.getCustomRepositoryTarget(this as any);
        if (!target)
            throw new CustomRepositoryDoesNotHaveEntityError(this.constructor);

        return this.manager.getRepository<Entity>(target);
    }

    /**
     * Gets the original ORM tree repository for the entity that is managed by this repository.
     * If current repository does not manage any entity, then exception will be thrown.
     */
    protected get treeRepository(): TreeRepository<Entity> {
        const target = this.getCustomRepositoryTarget(this as any);
        if (!target)
            throw new CustomRepositoryDoesNotHaveEntityError(this.constructor);

        return this.manager.getTreeRepository<Entity>(target);
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Creates a new query builder for the repository's entity that can be used to build a sql query.
     * If current repository does not manage any entity, then exception will be thrown.
     */
    protected createQueryBuilder(alias: string): SelectQueryBuilder<Entity> {
        const target = this.getCustomRepositoryTarget(this.constructor);
        if (!target)
            throw new CustomRepositoryDoesNotHaveEntityError(this.constructor);

        return this.manager.getRepository<Entity>(target).createQueryBuilder(alias);
    }

    /**
     * Creates a new query builder for the given entity that can be used to build a sql query.
     */
    protected createQueryBuilderFor<T>(entity: ObjectType<T>, alias: string): SelectQueryBuilder<T> {
        return this.getRepositoryFor(entity).createQueryBuilder(alias);
    }

    /**
     * Gets the original ORM repository for the given entity class.
     */
    protected getRepositoryFor<T>(entity: ObjectType<T>): Repository<T> {
        return this.manager.getRepository(entity);
    }

    /**
     * Gets the original ORM tree repository for the given entity class.
     */
    protected getTreeRepositoryFor<T>(entity: ObjectType<T>): TreeRepository<T> {
        return this.manager.getTreeRepository(entity);
    }

    // -------------------------------------------------------------------------
    // Private Methods
    // -------------------------------------------------------------------------

    /**
     * Gets custom repository's managed entity.
     * If given custom repository does not manage any entity then undefined will be returned.
     */
    private getCustomRepositoryTarget(customRepository: any): Function|string|EntitySchema<any>|undefined {
        const entityRepositoryMetadataArgs = getMetadataArgsStorage().entityRepositories.find(repository => {
            return repository.target === (customRepository instanceof Function ? customRepository : (customRepository as any).constructor);
        });
        if (!entityRepositoryMetadataArgs)
            throw new CustomRepositoryNotFoundError(customRepository);

        return entityRepositoryMetadataArgs.entity;
    }

}
