import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Docente } from './docente.entity';
import { CicloAcademico } from './ciclo-academico.entity';

export enum EstadoReporte {
  PENDIENTE = 'pendiente',
  FIRMADO = 'firmado',
  STANDBY = 'standby'
}

export enum TipoFormato {
  FORMATO_1_CARGA_CENTRAL = '(FORMATO # 1) Carga Horaria Asignada (Sede Central)',
  FORMATO_2_DJ_CENTRAL = '(FORMATO # 2) Declaración Jurada (Sede Central)',
  FORMATO_1_CARGA_DESCONCENTRADA = '(FORMATO # 1) Carga Horaria Asignada (Sedes Desconcentradas)',
  FORMATO_2_DJ_DESCONCENTRADA = '(FORMATO # 2) Declaración Jurada (Sedes Desconcentradas)',
  FORMATO_3_HORARIO = '(FORMATO # 3) Horario Semanal del Docente',
}

@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'docente_id' })
  docenteId: number;

  @Column({ name: 'ciclo_id' })
  cicloId: number;

  @Column({ type: 'enum', enum: TipoFormato })
  formato: TipoFormato;

  @Column({ type: 'varchar', length: 100, default: 'Sede Central' })
  sede: string;

  @Column({ type: 'enum', enum: EstadoReporte, default: EstadoReporte.PENDIENTE })
  estado: EstadoReporte;

  @Column({ name: 'url_pdf', type: 'text', nullable: true })
  urlPdf: string;

  @Column({ name: 'fecha_firma', type: 'timestamp', nullable: true })
  fechaFirma: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Docente, (docente) => docente.id)
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => CicloAcademico, (ciclo) => ciclo.id)
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: CicloAcademico;
}
