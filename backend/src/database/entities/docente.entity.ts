import { Entity, PrimaryGeneratedColumn, Column, OneToMany, UpdateDateColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Horario } from './horario.entity';
import { AsignacionDocenteCurso } from './asignacion-docente-curso.entity';
import { Usuario } from './usuario.entity';
import { DocenteCarrera } from './docente-carrera.entity';
import { VentanaAtencion } from './ventana-atencion.entity';
import { peruTimestampTransformer } from './peru-timestamp.transformer';

export enum TipoContrato {
  NOMBRADO = 'nombrado',
  CONTRATADO = 'contratado',
}

export enum Categoria {
  PRINCIPAL = 'principal',
  ASOCIADO = 'asociado',
  AUXILIAR = 'auxiliar',
  JEFE_PRACTICA = 'jefe_practica',
}

export enum EstadoSeleccion {
  EN_ESPERA = 'en_espera',
  EN_ATENCION = 'en_atencion',
  FINALIZADO = 'finalizado',
}

@Entity('docentes')
@Index('idx_docentes_jerarquia', ['tipoContrato', 'categoria', 'antiguedadAnios'])
@Index('idx_docentes_activos', ['activo'])
export class Docente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  nombreCompleto: string;

  @Column({ type: 'varchar', length: 8, unique: true, nullable: true, name: 'numeroDocumento' })
  dni: string;

  @Column({ type: 'enum', enum: TipoContrato })
  tipoContrato: TipoContrato;

  @Column({ type: 'enum', enum: Categoria })
  categoria: Categoria;

  @Column({ type: 'integer', default: 0 })
  antiguedadAnios: number;

  @Column({ type: 'date', nullable: true })
  fechaIngreso: Date;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'enum', enum: EstadoSeleccion, default: EstadoSeleccion.EN_ESPERA })
  estadoSeleccion: EstadoSeleccion;

  @Column({ type: 'timestamp', nullable: true, transformer: peruTimestampTransformer })
  inicioAtencion: Date;

  @Column({ type: 'timestamp', nullable: true, transformer: peruTimestampTransformer })
  finAtencion: Date;

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegramId: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  emailPersonal: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'TIEMPO COMPLETO 40 H' })
  dedicacion: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: '0000', name: 'codigo_ibm' })
  codigoIBM: string;

  @Column({ type: 'text', nullable: true, name: 'firma_base64' })
  firmaBase64: string;

  @Column({ name: 'ventana_id', type: 'integer', nullable: true })
  ventanaId: number | null;

  @ManyToOne(() => VentanaAtencion)
  @JoinColumn({ name: 'ventana_id' })
  ventana: VentanaAtencion;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AsignacionDocenteCurso, (asignacion) => asignacion.docente, { cascade: true })
  asignaciones: AsignacionDocenteCurso[];

  @OneToMany(() => Horario, (horario) => horario.docente, { cascade: true })
  horarios: Horario[];

  @OneToMany(() => Usuario, (usuario) => usuario.docente)
  usuarios: Usuario[];

  @OneToMany(() => DocenteCarrera, (dc) => dc.docente, { cascade: true })
  carreras: DocenteCarrera[];
}
