import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateFilterClauseTable1731171800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "filter_clause",
        columns: [
          {
            name: "id",
            type: "bigint",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "identity",
          },
          {
            name: "filter_id",
            type: "bigint",
            isNullable: false,
          },
          {
            name: "clause_id",
            type: "bigint",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign key for filter_id
    await queryRunner.createForeignKey(
      "filter_clause",
      new TableForeignKey({
        columnNames: ["filter_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "filter",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );

    // Create foreign key for clause_id
    await queryRunner.createForeignKey(
      "filter_clause",
      new TableForeignKey({
        columnNames: ["clause_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "clause",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("filter_clause");

    if (table) {
      const filterForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("filter_id") !== -1,
      );
      const clauseForeignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf("clause_id") !== -1,
      );

      if (filterForeignKey) {
        await queryRunner.dropForeignKey("filter_clause", filterForeignKey);
      }
      if (clauseForeignKey) {
        await queryRunner.dropForeignKey("filter_clause", clauseForeignKey);
      }
    }

    await queryRunner.dropTable("filter_clause");
  }
}
