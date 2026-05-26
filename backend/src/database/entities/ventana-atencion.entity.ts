import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { CicloAcademico } from './ciclo-academico.entity';
import { peruTimestampTransformer } from './peru-timestamp.transformer';

export enum TipoContratoVentana {
  NOMBRADO = 'nombrado',
  CONTRATADO = 'contratado',
}

export enum CategoriaVentana {
  PRINCIPAL = 'principal',
  ASOCIADO = 'asociado',
  AUXILIAR = 'auxiliar',
  JEFE_PRACTICA = 'jefe_practica',
}

export enum EstadoVentana {
  PROGRAMADA = 'programada',
  EN_CURSO = 'en_curso',
  FINALIZADA = 'finalizada',
}

@Entity('ventanas_atencion')
export class VentanaAtencion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ciclo_id', type: 'integer' })
  cicloId: number;

  @Column({ type: 'enum', enum: TipoContratoVentana, nullable: true })
  tipoContrato: TipoContratoVentana;

  @Column({ type: 'enum', enum: CategoriaVentana, nullable: true })
  categoriaDocente: CategoriaVentana;

  @Column({ type: 'timestamp', transformer: peruTimestampTransformer })
  fechaHoraInicio: Date;

  @Column({ type: 'timestamp', transformer: peruTimestampTransformer })
  fechaHoraFin: Date;

  @Column({ type: 'integer', default: 60 })
  duracionMinutos: number;

  @Column({ type: 'enum', enum: EstadoVentana, default: EstadoVentana.PROGRAMADA })
  estado: EstadoVentana;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => CicloAcademico)
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: CicloAcademico;
}
