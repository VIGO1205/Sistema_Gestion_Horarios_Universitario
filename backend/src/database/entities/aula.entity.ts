import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Horario } from './horario.entity';

export enum TipoAula {
  TEORIA = 'teoría',
  PRACTICA = 'práctica',
  LABORATORIO = 'laboratorio',
}

@Entity('aulas')
export class Aula {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'enum', enum: TipoAula })
  tipo: TipoAula;

  @Column({ type: 'integer', default: 30 })
  capacidad: number;

  @Column({ type: 'boolean', default: true })
  disponible: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Horario, (horario) => horario.aula, { cascade: true })
  horarios: Horario[];
}
