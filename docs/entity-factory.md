

# Entity Factory

* [What is an Entity Factory?](#what-is-entity-factory)
* [Default Entity Factory](#default-entity-factory)
* [Custom Entity Factory](#custom-entity-factory)
* [Entity Factory API](#entity-factory-api)

## What is an Entity Factory?

When you query your database to find entities, for example:

```typescript
const person = await connection.manager.findOne(Person, 1);
```

TypeOrm will first instantiate the entity (create an object in memory), then populate its property according to the column mappings you have defined for that entity.

To create the entity, TypeOrm uses an Entity Factory.

## Default Entity Factory

The default Entity Factory used by TypeOrm will instantiate an entity without calling its constructor. 

Example:

```typescript
import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    isActive: boolean;

    constructor() {
        console.log("Creating a User ...");
    }

}
```

The code implemented inside User's contructor will not be executed when you query your database:

```typescript
// Finding a User by Id ...
const person = await connection.manager.findOne(Person, 1);
// => No log displayed ...
```

## Custom Entity Factory

If you wish to change TypeOrm default behavior regarding entity instantiation, you can define a custom Entity Factory in your configuration, and fine-tune how TypeOrm is creating your entities.

For example, if you want TypeOrm to call your entity constructor upon entity creation, you can use the following configuration:

```typescript
import {createConnection, Connection} from "typeorm";

const connection = await createConnection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    entityFactory: {
        createEntity(target: Function) {
            return new (<any> target)();
        }
    }
});
```

The code implemented inside User's contructor will now be executed when you query your database:

```typescript
// Finding a User by Id ...
const person = await connection.manager.findOne(Person, 1);
// => "Creating a User ..."
```

As this way of creating entities was previously the default behavior, TypeOrm provides a built-in factory offering the exact same behavior as the one implemented in the example. Thus you can use the following configuration if you find it neater:

```typescript
import {createConnection, Connection, OldEntityFactory} from "typeorm";

const connection = await createConnection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    entityFactory: new OldEntityFactory()
    // This configuration has the same effect as doing:
    // entityFactory: {
    //    createEntity(target: Function) {
    //        return new (<any> target)();
    //    }
    // }
});
```

## Entity Factory API

When you define a custom Entity Factory, you need to implement the `createEntity()` method. Example:

```typescript
import {createConnection, Connection} from "typeorm";

const connection = await createConnection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    entityFactory: {
        createEntity(target: Function) {
            return new (<any> target)();
        }
    }
});
```

This method will be called by TypeOrm everytime it needs to instantiate an entity's object, for example following the execution of a query you have implemented.

The `target` argument is the entity's type to be created.
A second optional argument `entityMetadata` is also passed. This points to the TypeOrm's metadatas defined for the entity to be instantiated. This gives you extended information that you can use to fine-tune how your entities are created. Example:

```typescript
import {createConnection, Connection, EntityMetadata} from "typeorm";

const connection = await createConnection({
    type: "mysql",
    host: "localhost",
    port: 3306,
    entityFactory: {
        createEntity(target: Function, entityMetadata: EntityMetadata) {
            // ...
        }
    }
});
```