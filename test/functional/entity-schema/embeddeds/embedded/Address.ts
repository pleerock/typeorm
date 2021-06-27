import { EntitySchema } from "../../../../../src";
import { Coordinates, CoordinatesSchema } from "./Coordinates";

export interface Address {
    zipcode: string;
    city?: string | null;
    coordinates: Coordinates;
}

export const AddressSchema = new EntitySchema<Address>({
    name: "address",
    columns: {
        zipcode: {
            name: "zipcode",
            type: "text",
            nullable: false
        },
        city: {
            name: "city",
            type: "text",
            nullable: true
        },
    },
    embeddeds: {
        coordinates: {
            isArray: false,
            type: () => CoordinatesSchema,
        }
    }
});