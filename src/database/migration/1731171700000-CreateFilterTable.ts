import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFilterTable1731171700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE social_media.x_filter (
        id bigint IDENTITY(1,1) NOT NULL,
        name nvarchar(255) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        [type] varchar(50) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        [filter] nvarchar(MAX) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        created_at datetime DEFAULT getdate() NOT NULL,
        updated_at datetime NULL,
        deleted_at datetime NULL,
        CONSTRAINT PK__filter__3213E83FB3B77CBB PRIMARY KEY (id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE social_media.x_filter`);
  }
}
