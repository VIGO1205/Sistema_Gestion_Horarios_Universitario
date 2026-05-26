import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Docente } from './docente.entity';

export enum TipoNotificacion {
  TURNO_ACTIVO = 'turno_activo',
  RECORDATORIO_15MIN = 'recordatorio_15min',
  RECORDATORIO_24H = 'recordatorio_24h',
  MENSAJE_SISTEMA = 'mensaje_sistema',
}

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  docenteId: number;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ type: 'enum', enum: TipoNotificacion })
  tipo: TipoNotificacion;

  @Column({ type: 'boolean', default: false })
  leido: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Docente)
  @JoinColumn({ name: 'docenteId' })
  docente: Docente;
}
