import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { dataSource } from './data-source';

// Cargar variables de entorno
dotenv.config();
import { Docente, TipoContrato, Categoria } from '../entities/docente.entity';
import { Aula, TipoAula } from '../entities/aula.entity';
import { Usuario, RolUsuario } from '../entities/usuario.entity';
import { CicloAcademico } from '../entities/ciclo-academico.entity';
import { Carrera } from '../entities/carrera.entity';
import { DocenteCarrera } from '../entities/docente-carrera.entity';
import { Lugar } from '../entities/lugar.entity';

async function runSeeds() {
  try {
    await dataSource.initialize();
    await dataSource.synchronize();

    const docenteRepository = dataSource.getRepository(Docente);
    const aulaRepository = dataSource.getRepository(Aula);
    const usuarioRepository = dataSource.getRepository(Usuario);
    const cicloRepo = dataSource.getRepository(CicloAcademico);
    const carreraRepo = dataSource.getRepository(Carrera);
    const docenteCarreraRepository = dataSource.getRepository(DocenteCarrera);
    const lugarRepo = dataSource.getRepository(Lugar);

    console.log('Iniciando seed de Lugares...');
    const lugaresData = [
      ['F01', 'CC. Agropecuarias'],
      ['F02', 'CC. Biológicas'],
      ['F03', 'CC. Económicas'],
      ['F04', 'CC. Físicas y Matemáticas'],
      ['F05', 'CC. Sociales'],
      ['F06', 'Derecho y Ciencias Políticas'],
      ['F07', 'Educación y Comunicación'],
      ['F08', 'Enfermería'],
      ['F09', 'Estomatología'],
      ['F10', 'Farmacia y Bioquímica'],
      ['F11', 'Ingeniería'],
      ['F12', 'Ingeniería Química'],
      ['F13', 'Medicina'],
      ['F14', 'Filial Valle Jequetepeque'],
      ['F15', 'Filial Huamachuco'],
      ['F16', 'Filial Santiago de Chuco'],
      ['OA', 'Oficina Administrativa'],
      ['SC', 'Salida de Campo'],
    ];

    const existingLugares = await lugarRepo.find();
    const lugarByCodigo = new Map(existingLugares.map((lugar) => [lugar.codigo, lugar]));

    for (const [codigo, nombre] of lugaresData) {
      const existente = lugarByCodigo.get(codigo);
      if (!existente) {
        await lugarRepo.save({ codigo, nombre });
        console.log(`Insertado lugar: ${codigo} - ${nombre}`);
      } else {
        console.log(`Ya existe lugar: ${codigo} - ${nombre}`);
      }
    }
    console.log('Seed de Lugares completado.\n');

    console.log('Iniciando limpieza de base de datos...');
    
    // Limpieza profunda de tablas relacionadas con docentes para evitar errores de integridad
    // Eliminamos en orden de dependencia
    await dataSource.query('DELETE FROM "notificaciones"');
    await dataSource.query('DELETE FROM "horarios"');
    await dataSource.query('DELETE FROM "asignacion_docente_curso"');
    await dataSource.query('DELETE FROM "docente_carrera"');
    
    // Borrar usuarios que no sean admin para recrearlos si es necesario
    await usuarioRepository.delete({ rol: RolUsuario.DOCENTE });
    await usuarioRepository.delete({ rol: RolUsuario.COORDINADOR });
    
    // Finalmente borramos docentes
    await dataSource.query('DELETE FROM "docentes"');

    console.log('Limpieza completada.');

    const existingCiclos = await cicloRepo.find();
    const existingAulas = await aulaRepository.find();
    const existingUsuarios = await usuarioRepository.find();
    const existingCarreras = await carreraRepo.find();

    const cicloByNombre = new Map(existingCiclos.map((ciclo) => [ciclo.nombre, ciclo]));
    const aulaByNombre = new Map(existingAulas.map((aula) => [aula.nombre, aula]));
    const usuarioByEmail = new Map(existingUsuarios.map((usuario) => [usuario.email, usuario]));
    const carreraByNombre = new Map(existingCarreras.map((carrera) => [carrera.nombre, carrera]));

    // 1. Ciclos Académicos
    const ciclosData = [
      { nombre: '2024-I', fechaInicio: new Date('2024-04-01'), fechaFin: new Date('2024-08-31'), esActual: false },
      { nombre: '2024-II', fechaInicio: new Date('2024-09-01'), fechaFin: new Date('2025-01-31'), esActual: false },
      { nombre: '2025-I', fechaInicio: new Date('2025-04-01'), fechaFin: new Date('2025-08-31'), esActual: false },
      { nombre: '2025-II', fechaInicio: new Date('2025-09-01'), fechaFin: new Date('2026-01-31'), esActual: false },
      { nombre: '2026-I', fechaInicio: new Date('2026-04-01'), fechaFin: new Date('2026-08-31'), esActual: true },
    ];
    const ciclosGuardados = [] as CicloAcademico[];
    for (const cicloData of ciclosData) {
      const existente = cicloByNombre.get(cicloData.nombre);
      if (existente) {
        existente.fechaInicio = cicloData.fechaInicio;
        existente.fechaFin = cicloData.fechaFin;
        existente.esActual = cicloData.esActual;
        ciclosGuardados.push(await cicloRepo.save(existente));
      } else {
        ciclosGuardados.push(await cicloRepo.save(cicloData as any));
      }
    }

    // 1.1 Carreras Profesionales
    const carrerasData = [
      { nombre: 'Ingeniería de Sistemas', facultad: 'Facultad de Ingeniería', codigo: 'SIST' },
      { nombre: 'Ingeniería Industrial', facultad: 'Facultad de Ingeniería', codigo: 'IND' },
      { nombre: 'Medicina Humana', facultad: 'Facultad de Medicina', codigo: 'MED' },
      { nombre: 'Derecho y Ciencias Políticas', facultad: 'Facultad de Derecho', codigo: 'DER' },
    ];
    const carrerasGuardadas = [] as Carrera[];
    for (const carreraData of carrerasData) {
      const existente = carreraByNombre.get(carreraData.nombre);
      if (existente) {
        existente.facultad = carreraData.facultad;
        existente.codigo = carreraData.codigo;
        carrerasGuardadas.push(await carreraRepo.save(existente));
      } else {
        carrerasGuardadas.push(await carreraRepo.save(carreraData as any));
      }
    }

    // 2. Docentes Reales de Ingeniería de Sistemas (Extraídos de las imágenes de horarios)
    const docentesData = [
      // De la primera imagen (Ciclo V)
      { nombreCompleto: 'Luis Bay Chavell', dni: '10000001', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 20, fechaIngreso: new Date('2004-01-01'), activo: true },
      { nombreCompleto: 'Consuelo Barreto Arguello Escriba', dni: '10000002', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 15, fechaIngreso: new Date('2009-01-01'), activo: true },
      { nombreCompleto: 'Carlos Arturo Yactayo Tacora', dni: '10000003', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 18, fechaIngreso: new Date('2006-01-01'), activo: true },
      { nombreCompleto: 'Camilo Andres Salazar', dni: '10000004', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 8, fechaIngreso: new Date('2016-01-01'), activo: true },
      { nombreCompleto: 'Marcos Becera Lopez', dni: '10000005', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 10, fechaIngreso: new Date('2014-01-01'), activo: true },
      { nombreCompleto: 'Ana Cuadra Mizquebay', dni: '10000006', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 5, fechaIngreso: new Date('2019-01-01'), activo: true },
      // De la segunda imagen (Ciclo VII)
      { nombreCompleto: 'Juan Pedro Santos Fernandez', dni: '10000007', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 22, fechaIngreso: new Date('2002-01-01'), activo: true },
      { nombreCompleto: 'Teresa Tarazona Arbildo', dni: '10000008', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 14, fechaIngreso: new Date('2010-01-01'), activo: true },
      { nombreCompleto: 'Alonso Miguel Apaza Benites', dni: '10000009', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 19, fechaIngreso: new Date('2005-01-01'), activo: true },
      { nombreCompleto: 'Paul Carbajal Castillejos', dni: '10000010', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 4, fechaIngreso: new Date('2020-01-01'), activo: true },
      { nombreCompleto: 'Dioser Rondar Vasquez', dni: '10000011', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 5, fechaIngreso: new Date('2019-01-01'), activo: true },
      // De la tercera imagen (Ciclo IX)
      { nombreCompleto: 'Ricardo Membrive Rivera', dni: '10000012', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 20, fechaIngreso: new Date('2004-01-01'), activo: true },
      { nombreCompleto: 'Eduardo Mendoza Alvarez', dni: '10000013', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 15, fechaIngreso: new Date('2009-01-01'), activo: true },
      { nombreCompleto: 'Wilson Mendoza de los Santos', dni: '10000014', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 12, fechaIngreso: new Date('2012-01-01'), activo: true },
      { nombreCompleto: 'Oscar Peralt Alcantara Moreno', dni: '10000015', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 18, fechaIngreso: new Date('2006-01-01'), activo: true },
      { nombreCompleto: 'Jorge Estema Vilcarima', dni: '10000016', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 8, fechaIngreso: new Date('2016-01-01'), activo: true },
      { nombreCompleto: 'Luis Gomez Aulia', dni: '10000017', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 10, fechaIngreso: new Date('2014-01-01'), activo: true },
      // De la cuarta imagen (Ciclo I)
      { nombreCompleto: 'Dario Mendoza de los Santos', dni: '10000018', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 15, fechaIngreso: new Date('2009-01-01'), activo: true },
      { nombreCompleto: 'Pamela Carrillo Castillejos', dni: '10000019', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 12, fechaIngreso: new Date('2012-01-01'), activo: true },
      { nombreCompleto: 'Bertha Linda Baile', dni: '10000020', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 8, fechaIngreso: new Date('2016-01-01'), activo: true },
      { nombreCompleto: 'Jose Luis Ponte Bojan', dni: '10000021', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 20, fechaIngreso: new Date('2004-01-01'), activo: true },
      { nombreCompleto: 'Yrma Ysabel Salazar Obando', dni: '10000022', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 10, fechaIngreso: new Date('2014-01-01'), activo: true },
      { nombreCompleto: 'Samuel Baltazar Queso', dni: '10000023', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 5, fechaIngreso: new Date('2019-01-01'), activo: true },
      { nombreCompleto: 'Miguel Enriques Apoala', dni: '10000024', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 18, fechaIngreso: new Date('2006-01-01'), activo: true },
      { nombreCompleto: 'Martha Carlesso', dni: '10000025', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 15, fechaIngreso: new Date('2009-01-01'), activo: true },
      // De la quinta imagen (Ciclo III) y los originales
      { nombreCompleto: 'Marco Ferrer Requejo', dni: '10000026', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 12, fechaIngreso: new Date('2012-01-01'), activo: true },
      { nombreCompleto: 'Ernesto Rojas Garcia', dni: '10000027', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 10, fechaIngreso: new Date('2014-01-01'), activo: true },
      { nombreCompleto: 'Juan Carranza Cabanillas', dni: '10000028', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 6, fechaIngreso: new Date('2018-01-01'), activo: true },
      { nombreCompleto: 'Nilo Mendez Odi', dni: '10000029', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 4, fechaIngreso: new Date('2020-01-01'), activo: true },
      { nombreCompleto: 'Sheyla Guari Escobedo Rodriguez', dni: '10000030', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 3, fechaIngreso: new Date('2021-01-01'), activo: true },
      // Originales que ya estaban y no se repiten
      { nombreCompleto: 'Cesar Arellano Salazar', dni: '10000031', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 21, fechaIngreso: new Date('2003-01-01'), activo: true },
      { nombreCompleto: 'Marcelino Torres Villanueva', dni: '10000032', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 25, fechaIngreso: new Date('1999-01-01'), activo: true },
      { nombreCompleto: 'Everson Agreda Gamboa', dni: '10000033', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 20, fechaIngreso: new Date('2004-01-01'), activo: true },
      { nombreCompleto: 'Alberto Mendoza de los Santos', dni: '10000034', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 12, fechaIngreso: new Date('2012-01-01'), activo: true },
      { nombreCompleto: 'Luis Enrique Boy Chavil', dni: '10000035', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 18, fechaIngreso: new Date('2006-01-01'), activo: true },
      { nombreCompleto: 'José Alberto Gómez Ávila', dni: '10000036', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 22, fechaIngreso: new Date('2002-01-01'), activo: true },
      { nombreCompleto: 'Ricardo Darío Mendoza Rivera', dni: '10000037', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 10, fechaIngreso: new Date('2014-01-01'), activo: true },
      { nombreCompleto: 'Juan Carlos Obando Roldán', dni: '10000038', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 24, fechaIngreso: new Date('2000-01-01'), activo: true },
      { nombreCompleto: 'Robert Jerry Sánchez Ticona', dni: '10000039', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 8, fechaIngreso: new Date('2016-01-01'), activo: true },
      { nombreCompleto: 'Zoraida Yanet Vidal Melgarejo', dni: '10000040', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 5, fechaIngreso: new Date('2019-01-01'), activo: true },
      { nombreCompleto: 'Silvia Ana Rodríguez Aguirre', dni: '10000041', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 6, fechaIngreso: new Date('2018-01-01'), activo: true },
      { nombreCompleto: 'Camilo Ernesto Suarez Rebaza', dni: '10000042', condicion: TipoContrato.NOMBRADO, categoria: Categoria.ASOCIADO, antiguedadAnios: 14, fechaIngreso: new Date('2010-01-01'), activo: true },
      { nombreCompleto: 'Oscar Romel Alcantara Moreno', dni: '10000043', condicion: TipoContrato.NOMBRADO, categoria: Categoria.PRINCIPAL, antiguedadAnios: 19, fechaIngreso: new Date('2005-01-01'), activo: true },
      { nombreCompleto: 'Franklin Alexis Díaz Díaz', dni: '10000044', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 4, fechaIngreso: new Date('2020-01-01'), activo: true },
      { nombreCompleto: 'Victor Antonio Charcape Ravelo', dni: '10000045', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 7, fechaIngreso: new Date('2017-01-01'), activo: true },
      { nombreCompleto: 'Juan Luis Cordova Otero', dni: '10000046', condicion: TipoContrato.NOMBRADO, categoria: Categoria.AUXILIAR, antiguedadAnios: 3, fechaIngreso: new Date('2021-01-01'), activo: true },
    ];

    const docentesGuardados = [] as Docente[];
    for (const data of docentesData) {
      docentesGuardados.push(await docenteRepository.save(data as any));
    }

    // 3. Aulas
    const aulas = [
      ...[101, 102, 103, 104, 105].map((num) => ({
        nombre: `${num}`,
        tipo: TipoAula.TEORIA,
        capacidad: 40,
        disponible: true,
      })),
      ...[201, 202, 203, 204, 205].map((num) => ({
        nombre: `${num}`,
        tipo: TipoAula.PRACTICA,
        capacidad: 35,
        disponible: true,
      })),
      ...Array.from({ length: 6 }, (_, index) => ({
        nombre: `LAB 0${index + 1}`,
        tipo: TipoAula.LABORATORIO,
        capacidad: 25,
        disponible: true,
      })),
    ];

    const aulasGuardadas = [] as Aula[];
    for (const aulaData of aulas) {
      const existente = aulaByNombre.get(aulaData.nombre);
      if (existente) {
        existente.tipo = aulaData.tipo;
        existente.capacidad = aulaData.capacidad;
        existente.disponible = aulaData.disponible;
        aulasGuardadas.push(await aulaRepository.save(existente));
      } else {
        aulasGuardadas.push(await aulaRepository.save(aulaData as any));
      }
    }

    // 4. Usuarios (Admin, Coordinador y Docentes)
    const adminHash = await bcrypt.hash('admin123', 10);
    const coordinadorHash = await bcrypt.hash('123456', 10);
    const docenteHash = await bcrypt.hash('docente123', 10);

    const usuarioAdmin = usuarioByEmail.get('admin@unt.edu.pe');
    if (usuarioAdmin) {
      usuarioAdmin.passwordHash = adminHash;
      usuarioAdmin.rol = RolUsuario.ADMIN;
      usuarioAdmin.activo = true;
      usuarioAdmin.docenteId = null as any;
      await usuarioRepository.save(usuarioAdmin);
    } else {
      await usuarioRepository.save({
        email: 'admin@unt.edu.pe',
        passwordHash: adminHash,
        rol: RolUsuario.ADMIN,
        activo: true,
      } as any);
    }

    // Crear un usuario Coordinador para pruebas
    await usuarioRepository.save({
      email: 'coordinador@unt.edu.pe',
      passwordHash: coordinadorHash,
      rol: RolUsuario.COORDINADOR,
      activo: true,
    } as any);

    // Crear usuarios para cada docente real
    for (const docente of docentesGuardados) {
      const email = `${docente.nombreCompleto.split(' ')[0].toLowerCase()}.${docente.dni}@unt.edu.pe`;
      await usuarioRepository.save({
        email,
        passwordHash: docenteHash,
        rol: RolUsuario.DOCENTE,
        activo: true,
        docente: docente,
      } as any);
    }

    // 5. Asignar docentes a la carrera de Ingeniería de Sistemas
    const ingenieriaSistemas = carrerasGuardadas.find(c => c.nombre === 'Ingeniería de Sistemas');
    if (ingenieriaSistemas) {
      for (const docente of docentesGuardados) {
        await docenteCarreraRepository.save({
          docente,
          carrera: ingenieriaSistemas,
        });
      }
    }

    console.log('Seeds ejecutados correctamente');
    console.log(`Docentes reales registrados: ${docentesGuardados.length}`);
    console.log(`Usuarios creados: ${docentesGuardados.length + 2}`); // + Admin + Coordinador
    console.log(`Asignaciones a Ing. de Sistemas: ${docentesGuardados.length}`);

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Error ejecutando seeds:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

runSeeds();
