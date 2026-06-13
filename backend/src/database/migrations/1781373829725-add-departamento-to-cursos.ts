import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDepartamentoToCursos1781373829725 implements MigrationInterface {
    name = 'AddDepartamentoToCursos1781373829725'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cursos" ADD "departamento" character varying(100) NOT NULL DEFAULT 'General'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cursos" DROP COLUMN "departamento"`);
    }

}
