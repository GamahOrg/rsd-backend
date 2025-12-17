import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFilterClauseTable1731171800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`

      CREATE TABLE social_media.x_filter_clauses (
        id bigint IDENTITY(1,1) NOT NULL,
        filter_id bigint NOT NULL,
        clause_id bigint NOT NULL,
        deleted_at datetime NULL,
        CONSTRAINT PK__filter_c__3213E83FB3071DC8 PRIMARY KEY (id),
        CONSTRAINT FK_filter_clauses_clause FOREIGN KEY (clause_id) REFERENCES social_media.x_clause(id) ON DELETE CASCADE,
        CONSTRAINT FK_filter_clauses_filter FOREIGN KEY (filter_id) REFERENCES social_media.x_filter(id) ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE social_media.x_filter_clauses`);
  }
}
