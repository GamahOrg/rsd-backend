import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateClauseTable1731171600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE dbo.clause (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        include_clause NVARCHAR(MAX) NOT NULL,
        exclude_clause NVARCHAR(MAX) NOT NULL,
        operator NVARCHAR(255) NOT NULL DEFAULT 'AND',
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NULL,
        deleted_at DATETIME NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE dbo.clause`);
  }
}
