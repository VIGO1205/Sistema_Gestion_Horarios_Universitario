import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Aula } from './aula.entity';

@Entity('lugares')
export class Lugar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 3, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Aula, (aula) => aula.lugar)
  aulas: Aula[];
}
