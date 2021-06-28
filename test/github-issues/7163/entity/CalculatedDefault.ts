import { Column, Entity, PrimaryGeneratedColumn } from "../../../../src";

@Entity("calculatedDefault")
export class CalculatedDefault {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    noDefault: string;

    @Column({ default: "Hello" })
    defaultString: string;

    @Column({ default: 5 })
    defaultNumber: number;

    @Column({ default: true })
    defaultBoolean: boolean;

    @Column({ nullable: true, default: null })
    defaultNull: string;

    @Column({ calculatedDefault: "World" })
    calculatedDefaultString: string;

    @Column({ calculatedDefault: 17 })
    calculatedDefaultNumber: number;

    @Column({ calculatedDefault: false })
    calculatedDefaultBoolean: boolean;

    @Column({ calculatedDefault: () => calculatedDefault(10) })
    calculatedDefaultFunction: number;

    @Column({ nullable: true, calculatedDefault: null })
    calculatedDefaultNull: string;
}

function calculatedDefault(mul: number) {
    return Math.floor(Math.random() * mul);
}
