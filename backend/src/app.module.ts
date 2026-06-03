import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { HorariosModule } from './modules/horarios/horarios.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { DocentesModule } from './modules/docentes/docentes.module';
import { CursosModule } from './modules/cursos/cursos.module';
import { AulasModule } from './modules/aulas/aulas.module';
import { CiclosModule } from './modules/ciclos/ciclos.module';
import { CarrerasModule } from './modules/carreras/carreras.module';
import { IAModule } from './modules/ia/ia.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { ProgramacionesModule } from './modules/programaciones/programaciones.module';
import { VentanasModule } from './modules/ventanas/ventanas.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { CargaNoLectivaModule } from './modules/carga-no-lectiva/carga-no-lectiva.module';
import { Usuario } from './entities/usuario.entity';
import { Docente } from './entities/docente.entity';
import { Curso } from './entities/curso.entity';
import { Aula } from './entities/aula.entity';
import { CicloAcademico } from './entities/ciclo-academico.entity';
import { Horario } from './entities/horario.entity';
import { AsignacionDocenteCurso } from './entities/asignacion-docente-curso.entity';
import { ProgramacionCursoCiclo } from './entities/programacion-curso-ciclo.entity';
import { GrupoDocenteAsignacion } from './entities/grupo-docente-asignacion.entity';
import { Carrera } from './entities/carrera.entity';
import { DocenteCarrera } from './entities/docente-carrera.entity';
import { VentanaAtencion } from './entities/ventana-atencion.entity';
import { Notificacion } from './entities/notificacion.entity';
import { CargaNoLectiva } from './entities/carga-no-lectiva.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
        
        console.log(`Iniciando App en modo: ${nodeEnv}`);
        
        // Si hay DATABASE_URL (Render), la usamos directamente con SSL opcional
        if (databaseUrl) {
          console.log('Usando DATABASE_URL para la conexión');
          const isRender = databaseUrl.includes('render.com');
          
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: [Usuario, Docente, Curso, Aula, CicloAcademico, Horario, AsignacionDocenteCurso, ProgramacionCursoCiclo, GrupoDocenteAsignacion, Carrera, DocenteCarrera, VentanaAtencion, Notificacion, CargaNoLectiva],
            synchronize: nodeEnv !== 'production', // True solo si no es producción
            ssl: isRender || configService.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
          };
        }

        // Si no hay DATABASE_URL, usamos los valores por separado (Local)
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: configService.get<number>('DB_PORT') || 5432,
          username: configService.get<string>('DB_USER') || 'postgres',
          password: configService.get<string>('DB_PASSWORD') || 'password',
          database: configService.get<string>('DB_NAME') || 'horarios_unt',
          entities: [Usuario, Docente, Curso, Aula, CicloAcademico, Horario, AsignacionDocenteCurso, ProgramacionCursoCiclo, GrupoDocenteAsignacion, Carrera, DocenteCarrera, VentanaAtencion, Notificacion, CargaNoLectiva],
          synchronize: true,
          logging: false,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    HorariosModule,
    ReportesModule,
    DocentesModule,
    CursosModule,
    AulasModule,
    CiclosModule,
    CarrerasModule,
    IAModule,
    UsuariosModule,
    ProgramacionesModule,
    VentanasModule,
    NotificacionesModule,
    CargaNoLectivaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
