import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CicloAcademico } from './ciclo-academico.entity';

@Entity('configuraciones_grilla')
export class ConfiguracionGrilla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', unique: true })
  cicloId: number;

  @ManyToOne(() => CicloAcademico, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cicloId' })
  ciclo: CicloAcademico;

  @Column({ type: 'time', default: '07:00' })
  horaInicio: string;

  @Column({ type: 'time', default: '22:00' })
  horaFin: string;

  @Column({ type: 'time', default: '13:00' })
  almuerzoInicio: string;

  @Column({ type: 'time', default: '14:00' })
  almuerzoFin: string;

  @Column({ type: 'simple-array' })
  diasActivos: number[]; // [1, 2, 3, 4, 5, 6]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
