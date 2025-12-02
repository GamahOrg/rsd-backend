import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateClauseTable1731171600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE social_media.x_clause (
        id bigint IDENTITY(1,1) NOT NULL,
        name nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        include_clause nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        exclude_clause nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        operator nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS DEFAULT 'AND' NOT NULL,
        created_at datetime DEFAULT getdate() NOT NULL,
        updated_at datetime NULL,
        deleted_at datetime NULL,
        total_posts bigint NULL,
        total_impressions bigint NULL,
        positive_posts bigint NULL,
        negative_posts bigint NULL,
        neutral_posts bigint NULL,
        statistics_updated_at datetime NULL,
        include_accounts_clause nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS DEFAULT '' NULL,
        exclude_accounts_clause nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS DEFAULT '' NULL,
        include_to_accounts_clause nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
        exclude_to_accounts_clause nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NULL,
        CONSTRAINT PK_x_clause PRIMARY KEY (id)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE social_media.x_clause`);
  }
}
