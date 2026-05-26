import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Horario } from './horario.entity';
import { ProgramacionCursoCiclo } from './programacion-curso-ciclo.entity';

@Entity('ciclos_academicos')
export class CicloAcademico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  nombre: string; // Ej: "2024-I", "2024-II"

  @Column({ type: 'date' })
  fechaInicio: Date;

  @Column({ type: 'date' })
  fechaFin: Date;

  @Column({ type: 'boolean', default: false })
  esActual: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Horario, (horario) => horario.ciclo)
  horarios: Horario[];

  @OneToMany(() => ProgramacionCursoCiclo, (programacion) => programacion.ciclo)
  programacionesCurso: ProgramacionCursoCiclo[];
}
