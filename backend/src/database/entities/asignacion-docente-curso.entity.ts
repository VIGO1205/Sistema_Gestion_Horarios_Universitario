import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, OneToMany } from 'typeorm';
import { Docente } from './docente.entity';
import { Curso } from './curso.entity';
import { CicloAcademico } from './ciclo-academico.entity';
import { GrupoDocenteAsignacion } from './grupo-docente-asignacion.entity';

export enum TipoClase {
  TEORIA = 'teoria',
  PRACTICA = 'practica',
  LABORATORIO = 'laboratorio',
}

@Entity('asignacion_docente_curso')
export class AsignacionDocenteCurso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  docenteId: number;

  @Column({ type: 'integer' })
  cursoId: number;

  @Column({ name: 'ciclo_id', type: 'integer', nullable: true })
  cicloId: number;

  @Column({ type: 'enum', enum: TipoClase })
  tipoClase: TipoClase;

  @Column({ type: 'integer', default: 0 })
  horasSemanales: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Docente, (docente) => docente.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docenteId' })
  docente: Docente;

  @ManyToOne(() => Curso, (curso) => curso.asignaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cursoId' })
  curso: Curso;

  @ManyToOne(() => CicloAcademico)
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: CicloAcademico;

  @OneToMany(() => GrupoDocenteAsignacion, (g) => g.asignacion)
  grupos?: GrupoDocenteAsignacion[];
}
