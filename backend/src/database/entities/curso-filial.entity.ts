import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AsignacionFilial } from './asignacion-filial.entity';

@Entity('cursos_filiales')
export class CursoFilial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'asignacion_filial_id' })
  asignacionFilialId: number;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  dependencia: string;

  @Column({ name: 'horario_semanal', type: 'jsonb', nullable: true })
  horarioSemanal: { dia: string; horaInicio: string; horaFin: string }[];

  @Column({ type: 'varchar', length: 20 })
  turno: string;

  @Column({ name: 'total_horas_semanales', type: 'integer' })
  totalHorasSemanales: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => AsignacionFilial, (asignacion) => asignacion.cursos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asignacion_filial_id' })
  asignacion: AsignacionFilial;
}
