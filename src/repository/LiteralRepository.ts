import {DeepPartial} from "../common/DeepPartial";
import {ObjectID} from "../driver/mongodb/typings";
import {FindOptions, FindOptionsWhere} from "../find-options/FindOptions";
import {DeleteResult} from "../query-builder/result/DeleteResult";
import {UpdateResult} from "../query-builder/result/UpdateResult";
import {InsertResult} from "../query-builder/result/InsertResult";
import {QueryDeepPartialEntity} from "../query-builder/QueryPartialEntity";
import {SelectQueryBuilder} from "../query-builder/SelectQueryBuilder";
import {QueryRunner} from "../query-runner/QueryRunner";
import {RemoveOptions} from "./RemoveOptions";
import {SaveOptions} from "./SaveOptions";
import * as Observable from "zen-observable";
import {Repository} from "./Repository";
import {EntityManager} from "..";
import {EntityTarget} from "../common/EntityTarget";

/**
 * Repository is supposed to work with your entity objects. Find entities, insert, update, delete, etc.
 */
export function createLiteralRepository<Entity>({ manager, target, queryRunner }: {
    manager: EntityManager,
    target: EntityTarget<Entity>,
    queryRunner?: QueryRunner,
}): Repository<Entity> {

    return {
        typeof: "Repository",
        manager: manager,
        queryRunner: queryRunner,
        // get instance() { // todo: implement it later
        //     return this.getMetadata().instance
        // },

        get target(): Function | string {
            // if there is a metadata for this object, first we see if
            // this creates unpredictable result (and its a source of bugs), when before initialization target has one value,
            // and after initialization it has another value
            // todo: later we need to refactor this part to prevent confusion (maybe better to separate "target" from "instance")
            // todo: to make it, we need to replace all places where .target used as instance
            if (this.manager.connection.hasMetadata(target)) {
                return this.manager.connection.getMetadata(target).target;
            }
            return target as any;
        },

        getMetadata() {
            return this.manager.connection.getMetadata(target);
        },

        createQueryBuilder(alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity> {
            return this.manager.createQueryBuilder(this.getMetadata().target as any, alias || this.getMetadata().targetName as any, queryRunner || this.queryRunner as any);
        },

        hasId(entity: Entity): boolean {
            return this.manager.hasId(this.getMetadata().target, entity);
        },

        getId(entity: Entity): any {
            return this.manager.getId(this.getMetadata().target, entity);
        },

        create(plainEntityLikeOrPlainEntityLikes?: any): any {
            return this.manager.create(this.getMetadata().target as any, plainEntityLikeOrPlainEntityLikes as any);
        },

        merge(mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity {
            return this.manager.merge(this.getMetadata().target as any, mergeIntoEntity, ...entityLikes);
        },

        preload(entityLike: DeepPartial<Entity>): Promise<Entity | undefined> {
            return this.manager.preload(this.getMetadata().target as any, entityLike);
        },

        save<T extends DeepPartial<Entity>>(entityOrEntities: T | T[], options?: SaveOptions): Promise<T | T[]> {
            return this.manager.save(this.getMetadata().target as any, entityOrEntities as any, options);
        },

        remove(entityOrEntities: any, options?: RemoveOptions): Promise<any> {
            return this.manager.remove(this.getMetadata().target as any, entityOrEntities as any, options);
        },

        softRemove<T extends DeepPartial<Entity>>(entityOrEntities: T | T[], options?: SaveOptions): Promise<T | T[]> {
            return this.manager.softRemove(this.getMetadata().target as any, entityOrEntities as any, options);
        },

        recover<T extends DeepPartial<Entity>>(entityOrEntities: T | T[], options?: SaveOptions): Promise<T | T[]> {
            return this.manager.recover(this.getMetadata().target as any, entityOrEntities as any, options);
        },

        insert(entity: QueryDeepPartialEntity<Entity> | (QueryDeepPartialEntity<Entity>[])): Promise<InsertResult> {
            return this.manager.insert(this.getMetadata().target as any, entity);
        },

        update(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult> {
            return this.manager.update(this.getMetadata().target as any, criteria as any, partialEntity);
        },

        delete(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>): Promise<DeleteResult> {
            return this.manager.delete(this.getMetadata().target as any, criteria as any);
        },

        softDelete(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>): Promise<UpdateResult> {
            return this.manager.softDelete(this.getMetadata().target as any, criteria as any);
        },

        restore(criteria: string | string[] | number | number[] | Date | Date[] | ObjectID | ObjectID[] | FindOptionsWhere<Entity>): Promise<UpdateResult> {
            return this.manager.restore(this.getMetadata().target as any, criteria as any);
        },

        count(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<number> {
            return this.manager.count(this.getMetadata().target as any, optionsOrConditions as any);
        },

        find(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]> {
            return this.manager.find(this.getMetadata().target as any, optionsOrConditions as any);
        },

        findAndCount(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<[Entity[], number]> {
            return this.manager.findAndCount(this.getMetadata().target as any, optionsOrConditions as any);
        },

        findByIds(ids: any[], optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Promise<Entity[]> {
            return this.manager.findByIds(this.getMetadata().target as any, ids, optionsOrConditions as any);
        },

        findOne(optionsOrConditions?: string | number | Date | ObjectID | FindOptions<Entity> | FindOptionsWhere<Entity>, maybeOptions?: FindOptions<Entity>): Promise<Entity | undefined> {
            return this.manager.findOne(this.getMetadata().target as any, optionsOrConditions as any, maybeOptions);
        },

        findOneOrFail(optionsOrConditions?: string | number | Date | ObjectID | FindOptions<Entity> | FindOptionsWhere<Entity>, maybeOptions?: FindOptions<Entity>): Promise<Entity> {
            return this.manager.findOneOrFail(this.getMetadata().target as any, optionsOrConditions as any, maybeOptions);
        },

        observe<Entity>(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Observable<Entity[]> {
            return this.manager.observe(this.getMetadata().target, optionsOrConditions as any);
        },

        observeManyAndCount<Entity>(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Observable<[Entity[], number]> {
            return this.manager.observeManyAndCount(this.getMetadata().target, optionsOrConditions as any);
        },

        observeOne<Entity>(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Observable<Entity> {
            return this.manager.observeOne(this.getMetadata().target, optionsOrConditions as any);
        },

        observeCount<Entity>(optionsOrConditions?: FindOptions<Entity> | FindOptionsWhere<Entity>): Observable<number> {
            return this.manager.observeCount(this.getMetadata().target, optionsOrConditions as any);
        },

        query(query: string, parameters?: any[]): Promise<any> {
            return this.manager.query(query, parameters);
        },

        clear(): Promise<void> {
            return this.manager.clear(this.getMetadata().target);
        },

        increment(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number | string): Promise<UpdateResult> {
            return this.manager.increment(this.getMetadata().target as any, conditions, propertyPath, value);
        },

        decrement(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number | string): Promise<UpdateResult> {
            return this.manager.decrement(this.getMetadata().target as any, conditions, propertyPath, value);
        },

        extend<CustomRepository>(custom: CustomRepository & ThisType<Repository<Entity> & CustomRepository>): Repository<Entity> & CustomRepository {
            return {
                ...this,
                ...custom
            };
        }

    };
}
