import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { AsignacionDocenteCurso } from './asignacion-docente-curso.entity';
import { Horario } from './horario.entity';
import { Carrera } from './carrera.entity';
import { ProgramacionCursoCiclo } from './programacion-curso-ciclo.entity';
import { Curricula } from './curricula.entity';

export enum TipoCurso {
  TEORIA = 'teoria',
  LABORATORIO = 'laboratorio',
  AMBOS = 'ambos',
}

@Entity('cursos')
@Index('idx_curso_codigo', ['codigo'])
export class Curso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'integer', default: 0 })
  creditos: number;

  @Column({ type: 'varchar', length: 20 })
  cicloAcademico: string;

  @Column({ type: 'varchar', length: 100, default: 'General' })
  departamento: string;

  @Column({ name: 'carrera_id', type: 'integer', nullable: true })
  carreraId: number;

  @ManyToOne(() => Carrera, (carrera) => carrera.cursos)
  @JoinColumn({ name: 'carrera_id' })
  carrera: Carrera;

  @Column({ name: 'curricula_id', type: 'integer', nullable: true })
  curriculaId: number;

  @ManyToOne(() => Curricula, (curricula) => curricula.cursos, { nullable: true })
  @JoinColumn({ name: 'curricula_id' })
  curricula: Curricula;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => AsignacionDocenteCurso, (asignacion) => asignacion.curso, { cascade: true })
  asignaciones: AsignacionDocenteCurso[];

  @OneToMany(() => ProgramacionCursoCiclo, (programacion) => programacion.curso, { cascade: true })
  programacionesCiclo: ProgramacionCursoCiclo[];

  @OneToMany(() => Horario, (horario) => horario.curso, { cascade: true })
  horarios: Horario[];
}
