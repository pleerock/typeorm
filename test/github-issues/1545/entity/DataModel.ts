import {Column, Entity, JoinColumn, ManyToOne} from "../../../../src/index";
import {MainModel} from "./MainModel";
import {ValidationModel} from "./ValidationModel";
import {PrimaryColumn} from "../../../../src/decorator/columns/PrimaryColumn";

@Entity()
export class DataModel {

    @PrimaryColumn()
    validation: number;

    @ManyToOne(type => ValidationModel, { eager: true })
    @JoinColumn({
        name: "validation",
        referencedColumnName: "validation"
    })
    validations: ValidationModel;

    @PrimaryColumn()
    mainId: number;
    
    @ManyToOne(type => MainModel)
    @JoinColumn({
        name: "mainId",
        referencedColumnName: "id"
    })
    main: MainModel;
    
    @Column({
        type: "boolean",
        default: false
    })
    active: boolean;
}