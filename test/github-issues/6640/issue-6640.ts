import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../utils/test-utils";
import {Connection} from "../../../src/connection/Connection";
import {Form} from "./entity/Form";
import {FormTmpl} from "./entity/FormTmpl";
import { expect } from "chai";



describe("github issues > #6640 Cannot ORDER BY json field in query with JOIN and pagination", () => {

    let connections: Connection[];
    before(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        enabledDrivers: ["postgres"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    after(() => closeTestingConnections(connections));

    it("should correctly run query with join, order by json field and pagination", () => Promise.all(connections.map(async connection => {

      const formTmpls: FormTmpl[] = [
        {
          id: 1,
          origin: 1,
          name: "form1",
          publicSettings: [],
        },
        {
          id: 2,
          origin: 2,
          name: "form2",
          publicSettings: [],
        },
      ];
      await connection.getRepository(FormTmpl).save(formTmpls);

      const repo = connection.getRepository(Form);
      const form1 = new Form();
      form1.formTmplId = 1;
      form1.settings = "setting1";
      form1.extraSettings = {
        someNb: 7,
        someStr: "extra1",
      };
      await repo.save(form1);

      const form2 = new Form();
      form2.formTmplId = 2;
      form2.settings = "setting2";
      form2.extraSettings = {
        someNb: 21,
        someStr: "extra2",
      };
      await repo.save(form2);

      const form3 = new Form();
      form3.formTmplId = 1;
      form3.settings = "setting3";
      form3.extraSettings = {
        someNb: 5,
        someStr: "extra3",
      };
      await repo.save(form3);

      const form4 = new Form();
      form4.formTmplId = 1;
      form4.settings = "setting4";
      form4.extraSettings = {
        someNb: 40,
        someStr: "extra4",
      };
      await repo.save(form4);

      const orig = 1;
      const qb = connection.createQueryBuilder(Form, "form")
        .innerJoinAndSelect("form.formTmpl", "formTmpls", "formTmpls.origin = :orig", { orig })
        .orderBy({
          "form.extraSettings ->'someNb'": {
              order: "DESC",
              nulls: "NULLS LAST",
            }
        })
        .take(2);

      const [result, total] = await qb.getManyAndCount();

      expect(total).eq(3);
      expect(result.length).eq(2);
      expect(result[0].extraSettings!.someNb).eq(40);
    })));

});
