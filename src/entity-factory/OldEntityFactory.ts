import {EntityFactoryInterface} from "./EntityFactoryInterface";

export class OldEntityFactory implements EntityFactoryInterface {

    /**
     * Returns an entity object
     */
    createEntity(target: Function): Object {

        return new (<any> target)();

    }

}
