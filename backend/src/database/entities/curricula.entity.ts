import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Carrera } from './carrera.entity';
import { Curso } from './curso.entity';

@Entity('curriculas')
export class Curricula {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'int' })
  anio: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  pdfArchivo: string;

  @Column({ name: 'carrera_id', type: 'integer' })
  carreraId: number;

  @ManyToOne(() => Carrera, (carrera) => carrera.cursos)
  @JoinColumn({ name: 'carrera_id' })
  carrera: Carrera;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Curso, (curso) => curso.curricula)
  cursos: Curso[];
}
