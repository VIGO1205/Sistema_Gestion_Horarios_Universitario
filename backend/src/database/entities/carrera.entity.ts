import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Curso } from './curso.entity';
import { DocenteCarrera } from './docente-carrera.entity';

@Entity('carreras')
export class Carrera {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 150 })
  facultad: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  codigo: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Curso, (curso) => curso.carrera)
  cursos: Curso[];

  @OneToMany(() => DocenteCarrera, (dc) => dc.carrera, { cascade: true })
  docentes: DocenteCarrera[];
}
