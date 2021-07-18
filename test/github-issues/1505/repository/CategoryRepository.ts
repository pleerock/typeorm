import { Category } from "../entity/Category";
import {EntityRepository} from "../../../../src/decorator/EntityRepository";
import { Transaction, Repository, EntityManager, TransactionManager } from "../../../../src";

@EntityRepository(Category)
export class CategoryRepository extends Repository<Category> {

    constructor(public manager: EntityManager) {
        super();
    }

    @Transaction("postgres")
    async triggerNestedTransactionError(category: Category, @TransactionManager() entityManager?: EntityManager) {
        category.name = "new name";
        await this.triggerTransactionSuccess(category);
        throw new Error("COULD NOT SAVE THE CATEGORY");
    }

    @Transaction("postgres")
    async triggerTransactionError(category: Category, @TransactionManager() entityManager?: EntityManager) {
        category.name = "new name";
        throw new Error("COULD NOT SAVE THE CATEGORY");
    }

    @Transaction("postgres")
    triggerTransactionSuccess(category: Category, @TransactionManager() entityManager?: EntityManager) {
        category.name = "new name";
        category.title = "new title";
        return entityManager!.save(category);
    }
}
