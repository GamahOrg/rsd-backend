import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateClauseTable1731171600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "clause",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "identity",
          },
          {
            name: "name",
            type: "nvarchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "clause",
            type: "nvarchar",
            length: "max",
            isNullable: false,
          },
          {
            name: "created_at",
            type: "datetime",
            isNullable: false,
            default: "GETDATE()",
          },
          {
            name: "updated_at",
            type: "datetime",
            isNullable: true,
          },
          {
            name: "deleted_at",
            type: "datetime",
            isNullable: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("clause");
  }
}
