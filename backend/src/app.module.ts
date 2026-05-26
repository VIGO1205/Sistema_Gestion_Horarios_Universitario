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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: !configService.get('DATABASE_URL') ? (configService.get<string>('DB_HOST') || 'localhost') : undefined,
        port: !configService.get('DATABASE_URL') ? (configService.get<number>('DB_PORT') || 5432) : undefined,
        username: !configService.get('DATABASE_URL') ? (configService.get<string>('DB_USER') || 'postgres') : undefined,
        password: !configService.get('DATABASE_URL') ? (configService.get<string>('DB_PASSWORD') || 'password') : undefined,
        database: !configService.get('DATABASE_URL') ? (configService.get<string>('DB_NAME') || 'horarios_unt') : undefined,
        entities: [Usuario, Docente, Curso, Aula, CicloAcademico, Horario, AsignacionDocenteCurso, ProgramacionCursoCiclo, GrupoDocenteAsignacion, Carrera, DocenteCarrera, VentanaAtencion, Notificacion],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
        ssl: configService.get<string>('DB_SSL') === 'true' || configService.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
