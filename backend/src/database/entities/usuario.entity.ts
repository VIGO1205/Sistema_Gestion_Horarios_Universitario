import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Docente } from './docente.entity';

export enum RolUsuario {
  ADMIN = 'admin',
  DOCENTE = 'docente',
  COORDINADOR = 'coordinador',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.DOCENTE })
  rol: RolUsuario;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'integer', nullable: true })
  docenteId: number;

  @Column({ type: 'integer', default: 0 })
  intentosFallidos: number;

  @Column({ type: 'timestamp', nullable: true })
  bloqueadoHasta: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Docente, (docente) => docente.usuarios, { nullable: true })
  docente: Docente;
}
