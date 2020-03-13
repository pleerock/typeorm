import {Entity} from "../../../../src/decorator/entity/Entity";
import {Column} from "../../../../src/decorator/columns/Column";
import {PrimaryGeneratedColumn} from "../../../../src/decorator/columns/PrimaryGeneratedColumn";

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    private title: string;

    initialized?: true;

    constructor(title: string) {
        this.title = title;
        this.initialized = true;
    }

    public getTitle(): string {
        return this.title;
    }
}

