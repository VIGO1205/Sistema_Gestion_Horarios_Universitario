import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Docente } from './docente.entity';
import { CicloAcademico } from './ciclo-academico.entity';
import { CursoFilial } from './curso-filial.entity';

@Entity('asignaciones_filiales')
export class AsignacionFilial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'docente_id' })
  docenteId: number;

  @Column({ name: 'ciclo_id' })
  cicloId: number;

  @Column({ type: 'varchar', length: 100 })
  facultad: string;

  @Column({ name: 'departamento_academico', type: 'varchar', length: 100 })
  departamentoAcademico: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'date' })
  fechaFin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Docente)
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => CicloAcademico)
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: CicloAcademico;

  @OneToMany(() => CursoFilial, (curso) => curso.asignacion, { cascade: true })
  cursos: CursoFilial[];
}
