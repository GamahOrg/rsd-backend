import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFilterClauseTable1731171800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE dbo.filter_clauses (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        filter_id BIGINT NOT NULL,
        clause_id BIGINT NOT NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE dbo.filter_clauses 
      ADD CONSTRAINT FK_filter_clauses_filter 
      FOREIGN KEY (filter_id) REFERENCES dbo.filter(id) 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE dbo.filter_clauses 
      ADD CONSTRAINT FK_filter_clauses_clause 
      FOREIGN KEY (clause_id) REFERENCES dbo.clause(id) 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE dbo.filter_clauses`);
  }
}
