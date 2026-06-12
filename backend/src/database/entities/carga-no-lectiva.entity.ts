import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Docente } from './docente.entity';
import { CicloAcademico } from './ciclo-academico.entity';
import { CargaAcademica } from './carga-academica.entity';

@Entity('carga_no_lectiva')
export class CargaNoLectiva {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'carga_academica_id', nullable: true })
  cargaAcademicaId: number;

  @Column({ name: 'docente_id' })
  docenteId: number;

  @Column({ name: 'ciclo_id' })
  cicloId: number;

  // 2. PREPARACION Y EVALUACION (Max 50% de Trabajo Lectivo)
  @Column({ name: 'horas_preparacion', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasPreparacion: number;

  @Column({ name: 'detalle_preparacion', type: 'text', nullable: true })
  detallePreparacion: string;

  // 3. CONSEJERIA Y TUTORIA
  @Column({ name: 'horas_tutoria', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasTutoria: number;

  @Column({ name: 'detalle_tutoria', type: 'text', nullable: true })
  detalleTutoria: string;

  // 4. INVESTIGACIÓN
  @Column({ name: 'horas_investigacion', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasInvestigacion: number;

  @Column({ name: 'detalle_investigacion', type: 'text', nullable: true })
  detalleInvestigacion: string;

  // 5. CAPACITACIÓN
  @Column({ name: 'horas_capacitacion', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasCapacitacion: number;

  @Column({ name: 'detalle_capacitacion', type: 'text', nullable: true })
  detalleCapacitacion: string;

  // 6. ACTIVIDADES DE GOBIERNO
  @Column({ name: 'horas_gobierno', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasGobierno: number;

  @Column({ name: 'detalle_gobierno', type: 'text', nullable: true })
  detalleGobierno: string;

  // 7. ACTIVIDADES DE ADMINISTRACION
  @Column({ name: 'horas_administracion', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasAdministracion: number;

  @Column({ name: 'detalle_administracion', type: 'text', nullable: true })
  detalleAdministracion: string;

  // 8. ASESORIA DE TESIS, EXAMENES PROFESIONALES...
  @Column({ name: 'horas_asesoria', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasAsesoria: number;

  @Column({ name: 'detalle_asesoria', type: 'text', nullable: true })
  detalleAsesoria: string;

  // 9. RESPONSABILIDAD SOCIAL UNIVERSITARIA
  @Column({ name: 'horas_responsabilidad_social', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasResponsabilidadSocial: number;

  @Column({ name: 'detalle_responsabilidad_social', type: 'text', nullable: true })
  detalleResponsabilidadSocial: string;

  // 10. COMITES TECNICOS Y COMISIONES
  @Column({ name: 'horas_comites', type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasComites: number;

  @Column({ name: 'detalle_comites', type: 'text', nullable: true })
  detalleComites: string;

  @OneToOne(() => CargaAcademica, (ca) => ca.cargaNoLectiva)
  @JoinColumn({ name: 'carga_academica_id' })
  cargaAcademica: CargaAcademica;

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
