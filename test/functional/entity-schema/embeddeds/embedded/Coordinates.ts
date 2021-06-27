
import { EntitySchema } from "../../../../../src";

export interface Coordinates {
    longitude: number | null;
    latitude: number | null;
}

export const CoordinatesSchema = new EntitySchema<Coordinates>({
    name: "coordinates",
    columns: {
        longitude: {
            type: "double precision",
            nullable: true
        },
        latitude: {
            type: "double precision",
            nullable: true
        },
    }
});