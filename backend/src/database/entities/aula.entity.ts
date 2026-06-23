import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Horario } from './horario.entity';
import { Lugar } from './lugar.entity';

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

  @Column({ type: 'integer', nullable: true })
  lugarId: number | null;

  @ManyToOne(() => Lugar, (lugar) => lugar.aulas)
  @JoinColumn({ name: 'lugarId' })
  lugar: Lugar | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Horario, (horario) => horario.aula, { cascade: true })
  horarios: Horario[];
}
