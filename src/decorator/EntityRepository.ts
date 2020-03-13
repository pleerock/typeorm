import {getMetadataArgsStorage} from "../";
import {EntityRepositoryMetadataArgs} from "../metadata-args/EntityRepositoryMetadataArgs";
import {EntitySchema} from "../entity-schema/EntitySchema";

/**
 * Used to declare a class as a custom repository.
 * Custom repository can manage some specific entity or just be generic.
 * Custom repository optionally can extend AbstractRepository, Repository or TreeRepository.
 */
export function EntityRepository(entity?: Function | EntitySchema<any>): Function {
    return function (target: Function) {

        getMetadataArgsStorage().entityRepositories.push({
            target: target,
            entity: entity,
        } as EntityRepositoryMetadataArgs);
    };
}
