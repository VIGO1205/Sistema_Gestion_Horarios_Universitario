import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Docente } from './docente.entity';
import { CicloAcademico } from './ciclo-academico.entity';

export enum EstadoCargaNoLectiva {
  BORRADOR = 'borrador',
  PENDIENTE = 'pendiente',
  VALIDADO = 'validado',
}

@Entity('carga_no_lectiva')
export class CargaNoLectiva {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'docente_id' })
  docenteId: number;

  @Column({ name: 'ciclo_id' })
  cicloId: number;

  @Column({
    type: 'enum',
    enum: EstadoCargaNoLectiva,
    default: EstadoCargaNoLectiva.BORRADOR,
  })
  estado: EstadoCargaNoLectiva;

  // 2. PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasPreparacion: number;

  @Column({ type: 'text', nullable: true })
  detallePreparacion: string;

  // 3. CONSEJERIA Y TUTORIA
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasTutoria: number;

  @Column({ type: 'text', nullable: true })
  detalleTutoria: string;

  // 4. INVESTIGACIÓN
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasInvestigacion: number;

  @Column({ type: 'text', nullable: true })
  detalleInvestigacion: string;

  // 5. CAPACITACIÓN
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasCapacitacion: number;

  @Column({ type: 'text', nullable: true })
  detalleCapacitacion: string;

  // 6. ACTIVIDADES DE GOBIERNO
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasGobierno: number;

  @Column({ type: 'text', nullable: true })
  detalleGobierno: string;

  // 7. ACTIVIDADES DE ADMINISTRACION
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasAdministracion: number;

  @Column({ type: 'text', nullable: true })
  detalleAdministracion: string;

  // 8. ASESORIA DE TESIS, EXAMENES PROFESIONALES...
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasAsesoria: number;

  @Column({ type: 'text', nullable: true })
  detalleAsesoria: string;

  // 9. RESPONSABILIDAD SOCIAL UNIVERSITARIA
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasResponsabilidadSocial: number;

  @Column({ type: 'text', nullable: true })
  detalleResponsabilidadSocial: string;

  // 10. COMITES TECNICOS Y COMISIONES
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasComites: number;

  @Column({ type: 'text', nullable: true })
  detalleComites: string;

  @ManyToOne(() => Docente)
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => CicloAcademico)
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: CicloAcademico;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
