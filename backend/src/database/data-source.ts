import { DataSource } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { Docente } from '../entities/docente.entity';
import { Curso } from '../entities/curso.entity';
import { Aula } from '../entities/aula.entity';
import { CicloAcademico } from '../entities/ciclo-academico.entity';
import { Horario } from '../entities/horario.entity';
import { AsignacionDocenteCurso } from '../entities/asignacion-docente-curso.entity';
import { ProgramacionCursoCiclo } from '../entities/programacion-curso-ciclo.entity';
import { GrupoDocenteAsignacion } from '../entities/grupo-docente-asignacion.entity';
import { Carrera } from '../entities/carrera.entity';
import { DocenteCarrera } from '../entities/docente-carrera.entity';

export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // Prioridad a DATABASE_URL para Render
  host: !process.env.DATABASE_URL ? (process.env.DB_HOST || 'localhost') : undefined,
  port: !process.env.DATABASE_URL ? parseInt(process.env.DB_PORT || '5432') : undefined,
  username: !process.env.DATABASE_URL ? (process.env.DB_USER || 'postgres') : undefined,
  password: !process.env.DATABASE_URL ? (process.env.DB_PASSWORD || 'password') : undefined,
  database: !process.env.DATABASE_URL ? (process.env.DB_NAME || 'horarios_unt') : undefined,
  entities: [Usuario, Docente, Curso, Aula, CicloAcademico, Horario, AsignacionDocenteCurso, ProgramacionCursoCiclo, GrupoDocenteAsignacion, Carrera, DocenteCarrera],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  poolSize: 10,
  maxQueryExecutionTime: 3000,
  extra: {
    ssl: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
});
