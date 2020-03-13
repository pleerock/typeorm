import {Entity} from "../../../../src/decorator/entity/Entity";
import {Column} from "../../../../src/decorator/columns/Column";
import {PrimaryGeneratedColumn} from "../../../../src/decorator/columns/PrimaryGeneratedColumn";
import {VersionColumn} from "../../../../src/decorator/columns/VersionColumn";

@Entity()
export class PostVersioned {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    private title: string;

    @VersionColumn()
    version: number;

    initialized?: true;

    constructor(title: string) {
        this.title = title;
        this.initialized = true;
    }

    public getTitle(): string {
        return this.title;
    }
}
