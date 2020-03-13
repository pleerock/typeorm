import {EntityMetadata} from "../metadata/EntityMetadata";

/**
 * Class that implements this interface is en entity factory used by the orm to 
 * create entity objects.
 */
export interface EntityFactoryInterface {

    /**
     * Returns an entity object
     */
    createEntity(target: Function, entityMetadata: EntityMetadata): Object;

}