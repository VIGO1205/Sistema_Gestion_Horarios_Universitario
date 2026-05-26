import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Docente } from './docente.entity';
import { Curso } from './curso.entity';
import { Aula } from './aula.entity';
import { CicloAcademico } from './ciclo-academico.entity';
import { GrupoDocenteAsignacion } from './grupo-docente-asignacion.entity';

export enum TipoClaseHorario {
  TEORIA = 'teoria',
  PRACTICA = 'practica',
  LABORATORIO = 'laboratorio',
}

@Entity('horarios')
@Index('idx_horarios_docente_curso', ['docenteId', 'cursoId'])
@Index('idx_horarios_aula_dia', ['aulaId', 'diaSemana'])
@Index('idx_horarios_ciclo_id', ['cicloId'])
@Index('idx_horarios_no_cruce_aula', ['aulaId', 'diaSemana', 'horaInicio', 'horaFin', 'cicloId'])
@Index('idx_horarios_no_cruce_docente', ['docenteId', 'diaSemana', 'horaInicio', 'horaFin', 'cicloId'])
export class Horario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  docenteId: number;

  @Column({ type: 'integer' })
  cursoId: number;

  @Column({ type: 'integer' })
  aulaId: number;

  @Column({ type: 'integer' })
  cicloId: number;

  @Column({ type: 'enum', enum: TipoClaseHorario })
  tipoClase: TipoClaseHorario;

  @Column({ type: 'integer', default: 1 })
  diaSemana: number; // 1=Lunes, 7=Domingo

  @Column({ type: 'time' })
  horaInicio: string;

  @Column({ type: 'time' })
  horaFin: string;

  @Column({ type: 'boolean', default: true })
  esAutomatico: boolean; // True si generado automáticamente

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Docente, (docente) => docente.horarios, { onDelete: 'CASCADE' })
  docente: Docente;

  @ManyToOne(() => Curso, (curso) => curso.horarios, { onDelete: 'CASCADE' })
  curso: Curso;

  @ManyToOne(() => Aula, (aula) => aula.horarios, { onDelete: 'CASCADE' })
  aula: Aula;

  @ManyToOne(() => CicloAcademico, (ciclo) => ciclo.horarios, { onDelete: 'CASCADE' })
  ciclo: CicloAcademico;

  @Column({ name: 'grupo_id', type: 'integer', nullable: true })
  grupoId?: number;

  @ManyToOne(() => GrupoDocenteAsignacion, { nullable: true })
  @JoinColumn({ name: 'grupo_id' })
  grupo?: GrupoDocenteAsignacion;
}
