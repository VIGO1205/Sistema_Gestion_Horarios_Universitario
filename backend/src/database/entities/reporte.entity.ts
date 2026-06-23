import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Docente } from './docente.entity';
import { CicloAcademico } from './ciclo-academico.entity';

export enum EstadoReporte {
  PENDIENTE = 'pendiente',
  FIRMADO = 'firmado'
}

export enum TipoFormato {
  FORMATO_1_CARGA_CENTRAL = 'DECLARACION DE LA CARGA ACADEMICA DOCENTE (F01-CAD)',
  FORMATO_2_DJ_CENTRAL = 'DECLARACION JURADA DE NO ESTAR INCURSO EN CAUSALES DE INCOMPATIBILIDAD O IMPEDIMENTO LABORAL (F02-CAD)',
  FORMATO_3_HORARIO = 'HORARIO SEMANAL DE LA CARGA ACADEMICA DOCENTE (F03-CAD)',
  FORMATO_4_CARGA_ADICIONAL = 'DECLARACION DE CARGA HORARIA LECTIVA ASIGNADA EN FILIALES, POSTGRADO, SEGUNDAS ESPECIALIDADES Y CENTROS DE PRODUCCION Y EXTENSION UNIVERSITARIA (F04-CAD)',
}

@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'docente_id' })
  docenteId: number;

  @Column({ name: 'ciclo_id' })
  cicloId: number;

  @Column({ type: 'varchar', length: 200 })
  formato: string;

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
