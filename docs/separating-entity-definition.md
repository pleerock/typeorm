# Separating Entity Definition

- [Defining Schemas](#defining-schemas)
- [Extending Schemas](#extending-schemas)
- [Using Schemas](#using-schemas-to-query--insert-data)

## Defining Schemas

You can define an entity and its columns right in the model, using decorators. 
But some people prefer to define an entity and its columns inside separate files
which are called "entity schemas" in TypeORM.

Simple definition example:

```ts
import {EntitySchema} from "typeorm";

export const CategoryEntity = new EntitySchema({
    name: "category",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: true
        },
        name: {
            type: String
        }
    }
});
```

Example with relations:

```ts
import {EntitySchema} from "typeorm";

export const PostEntity = new EntitySchema({
    name: "post",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: true
        },
        title: {
            type: String
        },
        text: {
            type: String
        }
    },
    relations: {
        categories: {
            type: "many-to-many",
            target: "category" // CategoryEntity
        }
    }
});
```

Complex example:

```ts
import {EntitySchema} from "typeorm";

export const PersonSchema = new EntitySchema({
    name: "person",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: "increment"
        },
        firstName: {
            type: String,
            length: 30
        },
        lastName: {
            type: String,
            length: 50,
            nullable: false
        },
        age: {
            type: Number,
            nullable: false
        }
    },
    checks: [
        { expression: `"firstName" <> 'John' AND "lastName" <> 'Doe'` },
        { expression: `"age" > 18` }
    ],
    indices: [
        {
            name: "IDX_TEST",
            unique: true,
            columns: [
                "firstName",
                "lastName"
            ]
        }
    ],
    uniques: [
        {
            name: "UNIQUE_TEST",
            columns: [
                "firstName",
                "lastName"
            ]
        }
    ]
});
```

Example with embedded entity:

```ts
import {EntitySchema} from "typeorm";

const AddressEntity = new EntitySchema({
    name: 'address',
    columns: {
        city: {
            type: String
        },
        zipcode: {
            type: String
        }
    }
});

export const PersonEntity = new EntitySchema({
    name: "person",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: true
        },
        name: {
            type: String
        }
    },
    embeddeds: {
        address: {
            isArray: false,
            type: () => AddressEntity
        }
    }
});
```

If you want to make your entity typesafe, you can define a model and specify it in schema definition:

```ts
import {EntitySchema} from "typeorm";

export interface Category {
    id: number;
    name: string;
}

export const CategoryEntity = new EntitySchema<Category>({
    name: "category",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: true
        },
        name: {
            type: String
        }
    }
});
```

## Extending Schemas

When using the `Decorator` approach it is easy to `extend` basic columns to an abstract class and simply extend this. 
For example, your `id`, `createdAt` and `updatedAt` columns may be defined in such a `BaseEntity`. For more details, see 
the documentation on [concrete table inheritance](entity-inheritance.md#concrete-table-inheritance).

When using the `EntitySchema` approach, this is not possible. However, you can use the `Spread Operator` (`...`) to your 
advantage.

Reconsider the `Category` example from above. You may want to `extract` basic column descriptions and reuse it across 
your other schemas. This may be done in the following way:

```ts
import {EntitySchemaColumnOptions} from "typeorm";

export const BaseColumnSchemaPart = {
  id: {
    type: Number,
    primary: true,
    generated: true,
  } as EntitySchemaColumnOptions,
  createdAt: {
    name: 'created_at',
    type: 'timestamp with time zone',
    createDate: true,
  } as EntitySchemaColumnOptions,
  updatedAt: {
    name: 'updated_at',
    type: 'timestamp with time zone',
    updateDate: true,
  } as EntitySchemaColumnOptions,
};
```

Now you can use the `BaseColumnSchemaPart` in your other schema models, like this:

```ts
export const CategoryEntity = new EntitySchema<Category>({
    name: "category",
    columns: {
        ...BaseColumnSchemaPart,    
        // the CategoryEntity now has the defined id, createdAt, updatedAt columns!
        // in addition, the following NEW fields are defined
        name: {
            type: String
        }
    }
});
```

Be sure to add the `extended` columns also to the `Category` interface (e.g., via `export interface Category extend BaseEntity`).

## Using Schemas to Query / Insert Data

Of course, you can use the defined schemas in your repositories or entity manager as you would use the decorators.
Consider the previously defined `Category` example (with its `Interface` and `CategoryEntity` schema in order to get 
some data or manipulate the database.

```ts
// request data
const categoryRepository = getRepository<Category>(CategoryEntity);
const category = await categoryRepository.findOne(1); // category is properly typed!

// insert a new category into the database
const categoryDTO = {
  // note that the ID is autogenerated; see the schema above
  name: 'new category',
};
const newCategory = await categoryRepository.save(categoryDTO);
```
