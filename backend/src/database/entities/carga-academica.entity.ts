import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Docente } from './docente.entity';
import { CicloAcademico } from './ciclo-academico.entity';
import { CargaNoLectiva } from './carga-no-lectiva.entity';

export enum EstadoCargaAcademica {
  SIN_CARGA = 'sin_carga',
  BORRADOR = 'borrador',
  PENDIENTE = 'pendiente',
  VALIDADO = 'validado',
  FINALIZADO = 'finalizado',
}

@Entity('carga_academica')
export class CargaAcademica {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'docente_id' })
  docenteId: number;

  @Column({ name: 'ciclo_id' })
  cicloId: number;

  @Column({
    type: 'enum',
    enum: EstadoCargaAcademica,
    default: EstadoCargaAcademica.SIN_CARGA,
  })
  estado: EstadoCargaAcademica;

  @Column({ type: 'text', nullable: true })
  firmaDocente: string; // Base64 de la firma digital

  @Column({ type: 'boolean', default: false, name: 'incluir_firma_reportes' })
  incluirFirmaReportes: boolean;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'text', nullable: true, name: 'motivo_rechazo' })
  motivoRechazo: string | null;

  @Column({ type: 'smallint', nullable: true, name: 'declaracion_opcion' })
  declaracionOpcion: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalHorasLectivas: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalHorasNoLectivas: number;

  @Column({ type: 'timestamp', nullable: true })
  fechaFinalizacion: Date;

  @ManyToOne(() => Docente)
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => CicloAcademico)
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: CicloAcademico;

  @OneToOne(() => CargaNoLectiva, (noLectiva) => noLectiva.cargaAcademica)
  cargaNoLectiva: CargaNoLectiva;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
