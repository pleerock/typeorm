import { Address, AddressSchema } from "../embedded/Address";
import { EntitySchema } from "../../../../../src";

export interface Person {
    id: number;
    email: string;
    name: string;
    address: Address;
}

export const PersonSchema = new EntitySchema<Person>({
    name: "person",
    columns: {
        id: {
            type: Number,
            primary: true,
            generated: true
        },
        email: {
            type: "text",
            nullable: false
        },
        name: {
            name: "name",
            type: "text"
        }
    },
    embeddeds: {
        address: {
            isArray: false,
            type: () => AddressSchema
        }
    }
});