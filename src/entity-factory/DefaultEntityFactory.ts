import {EntityFactoryInterface} from "./EntityFactoryInterface";

export class DefaultEntityFactory implements EntityFactoryInterface {

    /**
     * Returns an entity object
     */
    createEntity(target: Function): Object {

        let ret: any = {};
        Reflect.setPrototypeOf(ret, target.prototype);
        return ret;

    }

}
