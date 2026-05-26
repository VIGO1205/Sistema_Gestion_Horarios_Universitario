import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Index } from 'typeorm';
import { Curso } from './curso.entity';
import { CicloAcademico } from './ciclo-academico.entity';

@Entity('programacion_curso_ciclo')
@Index('uq_programacion_curso_ciclo', ['cursoId', 'cicloId'], { unique: true })
export class ProgramacionCursoCiclo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'curso_id', type: 'integer' })
  cursoId: number;

  @Column({ name: 'ciclo_id', type: 'integer' })
  cicloId: number;

  @Column({ name: 'horas_teoria', type: 'integer', default: 0 })
  horasTeoria: number;

  @Column({ name: 'horas_practica', type: 'integer', default: 0 })
  horasPractica: number;

  @Column({ name: 'horas_laboratorio', type: 'integer', default: 0 })
  horasLaboratorio: number;

  @Column({ name: 'numero_grupos', type: 'integer', default: 0 })
  numeroGrupos: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Curso, (curso) => curso.programacionesCiclo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @ManyToOne(() => CicloAcademico, (ciclo) => ciclo.programacionesCurso, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: CicloAcademico;
}