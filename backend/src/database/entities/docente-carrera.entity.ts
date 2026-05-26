import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Docente } from './docente.entity';
import { Carrera } from './carrera.entity';

@Entity('docente_carrera')
export class DocenteCarrera {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Docente, (docente) => docente.carreras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'docente_id' })
  docente: Docente;

  @ManyToOne(() => Carrera, (carrera) => carrera.docentes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'carrera_id' })
  carrera: Carrera;

  @CreateDateColumn()
  createdAt: Date;
}
