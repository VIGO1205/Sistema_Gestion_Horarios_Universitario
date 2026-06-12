import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, Index, OneToMany } from 'typeorm';
import { AsignacionDocenteCurso } from './asignacion-docente-curso.entity';
import { Horario } from './horario.entity';

@Entity('grupo_docente_asignacion')
@Index('uq_grupo_asignacion', ['asignacionId', 'numeroGrupo'], { unique: true })
export class GrupoDocenteAsignacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'asignacion_id', type: 'integer' })
  asignacionId: number;

  @Column({ name: 'numero_grupo', type: 'integer' })
  numeroGrupo: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => AsignacionDocenteCurso, (asig) => (asig as any).grupos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asignacion_id' })
  asignacion: AsignacionDocenteCurso;

  @OneToMany(() => Horario, (h) => h.grupo)
  horarios: Horario[];
}
