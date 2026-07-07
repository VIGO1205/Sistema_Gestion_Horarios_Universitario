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
  NO_LECTIVA = 'no_lectiva',
}

export enum ActividadNoLectiva {
  PREPARACION = 'Preparación y Evaluación (PE)',
  TUTORIA = 'Tutoría y Consejería (TC)',
  INVESTIGACION = 'Investigación (INV)',
  CAPACITACION = 'Formación Académica y Capacitación (FAC)',
  GOBIERNO = 'Actividades de Gobierno o de Autoridad (AGA)',
  ADMINISTRACION = 'ADMINISTRACIÓN ACADÉMICA',
  ASESORIA = 'Asesoría de Tesis y Exámenes Profesionales (ATEP)',
  RESPONSABILIDAD_SOCIAL = 'Responsabilidad Social Universitaria (RSU)',
  COMITES = 'Comités y Comisiones Especiales (CC)',
  AAAI = 'Actividades de Gestión Institucional (AAAI)',
  AAEP = 'Autoevaluación/Acreditación Esc. Profesional (AAEP)',
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

  @Column({ type: 'integer', nullable: true })
  cursoId: number;

  @Column({ type: 'integer', nullable: true })
  aulaId: number;

  @Column({ type: 'integer' })
  cicloId: number;

  @Column({ type: 'enum', enum: TipoClaseHorario })
  tipoClase: TipoClaseHorario;

  @Column({ type: 'varchar', nullable: true })
  actividadNoLectiva: string;

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
