
-- ==========================================
-- SCRIPT DE SEEDS PARA BASE DE DATOS
-- ==========================================

-- Limpieza (opcional, para resetear)
-- DELETE FROM "docente_carrera";
-- DELETE FROM "usuarios" WHERE "rol" != 'ADMIN';
-- DELETE FROM "docentes";
-- DELETE FROM "aulas";
-- DELETE FROM "carreras";
-- DELETE FROM "ciclos_academicos";


-- 1. Ciclos Académicos
INSERT INTO "ciclos_academicos" ("nombre", "fechaInicio", "fechaFin", "esActual") VALUES
('2024-I', '2024-04-01', '2024-08-31', false),
('2024-II', '2024-09-01', '2025-01-31', false),
('2025-I', '2025-04-01', '2025-08-31', false),
('2025-II', '2025-09-01', '2026-01-31', false),
('2026-I', '2026-04-01', '2026-08-31', true);


-- 2. Carreras Profesionales
INSERT INTO "carreras" ("nombre", "facultad", "codigo") VALUES
('Ingeniería de Sistemas', 'Facultad de Ingeniería', 'SIST'),
('Ingeniería Industrial', 'Facultad de Ingeniería', 'IND'),
('Medicina Humana', 'Facultad de Medicina', 'MED'),
('Derecho y Ciencias Políticas', 'Facultad de Derecho', 'DER');


-- 3. Docentes
INSERT INTO "docentes" ("nombreCompleto", "dni", "condicion", "categoria", "antiguedadAnios", "fechaIngreso", "activo") VALUES
('Cesar Arellano Salazar', '10000001', 'NOMBRADO', 'PRINCIPAL', 20, '2004-01-01', true),
('Marcelino Torres Villanueva', '10000002', 'NOMBRADO', 'PRINCIPAL', 25, '1999-01-01', true),
('Everson Agreda Gamboa', '10000003', 'NOMBRADO', 'PRINCIPAL', 15, '2009-01-01', true),
('Alberto Mendoza de los Santos', '10000004', 'NOMBRADO', 'ASOCIADO', 12, '2012-01-01', true),
('Luis Enrique Boy Chavil', '10000005', 'NOMBRADO', 'PRINCIPAL', 18, '2006-01-01', true),
('José Alberto Gómez Ávila', '10000006', 'NOMBRADO', 'PRINCIPAL', 22, '2002-01-01', true),
('Ricardo Darío Mendoza Rivera', '10000007', 'NOMBRADO', 'ASOCIADO', 10, '2014-01-01', true),
('Juan Carlos Obando Roldán', '10000008', 'NOMBRADO', 'PRINCIPAL', 24, '2000-01-01', true),
('Juan Pedro Santos Fernandez', '10000009', 'NOMBRADO', 'PRINCIPAL', 21, '2003-01-01', true),
('Robert Jerry Sánchez Ticona', '10000010', 'NOMBRADO', 'ASOCIADO', 8, '2016-01-01', true),
('Zoraida Yanet Vidal Melgarejo', '10000011', 'NOMBRADO', 'AUXILIAR', 5, '2019-01-01', true),
('Silvia Ana Rodríguez Aguirre', '10000012', 'NOMBRADO', 'AUXILIAR', 6, '2018-01-01', true),
('Camilo Ernesto Suarez Rebaza', '10000013', 'NOMBRADO', 'ASOCIADO', 14, '2010-01-01', true),
('Oscar Romel Alcantara Moreno', '10000014', 'NOMBRADO', 'PRINCIPAL', 19, '2005-01-01', true),
('Franklin Alexis Díaz Díaz', '10000015', 'NOMBRADO', 'AUXILIAR', 4, '2020-01-01', true),
('Victor Antonio Charcape Ravelo', '10000016', 'NOMBRADO', 'AUXILIAR', 7, '2017-01-01', true),
('Juan Luis Cordova Otero', '10000017', 'NOMBRADO', 'AUXILIAR', 3, '2021-01-01', true);


-- 4. Lugares
INSERT INTO "lugares" ("codigo", "nombre") VALUES
('F01', 'CC. Agropecuarias'),
('F02', 'CC. Biológicas'),
('F03', 'CC. Económicas'),
('F04', 'CC. Físicas y Matemáticas'),
('F05', 'CC. Sociales'),
('F06', 'Derecho y Ciencias Políticas'),
('F07', 'Educación y Comunicación'),
('F08', 'Enfermería'),
('F09', 'Estomatología'),
('F10', 'Farmacia y Bioquímica'),
('F11', 'Ingeniería'),
('F12', 'Ingeniería Química'),
('F13', 'Medicina'),
('F14', 'Filial Valle Jequetepeque'),
('F15', 'Filial Huamachuco'),
('F16', 'Filial Santiago de Chuco'),
('OA', 'Oficina Administrativa'),
('SC', 'Salida de Campo');


-- 5. Aulas
INSERT INTO "aulas" ("nombre", "tipo", "capacidad", "disponible") VALUES
('101', 'TEORIA', 40, true),
('102', 'TEORIA', 40, true),
('103', 'TEORIA', 40, true),
('104', 'TEORIA', 40, true),
('105', 'TEORIA', 40, true),
('201', 'PRACTICA', 35, true),
('202', 'PRACTICA', 35, true),
('203', 'PRACTICA', 35, true),
('204', 'PRACTICA', 35, true),
('205', 'PRACTICA', 35, true),
('LAB 01', 'LABORATORIO', 25, true),
('LAB 02', 'LABORATORIO', 25, true),
('LAB 03', 'LABORATORIO', 25, true),
('LAB 04', 'LABORATORIO', 25, true),
('LAB 05', 'LABORATORIO', 25, true),
('LAB 06', 'LABORATORIO', 25, true);


-- 6. Usuarios
INSERT INTO "usuarios" ("email", "passwordHash", "rol", "activo") VALUES
('admin@unt.edu.pe', '$2a$10$0nWz6QSr45daMtzXJZLHIOz1wmUy.KJkPcOy.NcONurGTTLLef1Wy', 'ADMIN', true),
('coordinador@unt.edu.pe', '$2a$10$U/GdS6BDJ4Vlvq79OeZVROtS91R.q6EQjEwI3yB99GSDWYf4cnBf.', 'COORDINADOR', true);


-- 7. Usuarios de Docentes
INSERT INTO "usuarios" ("email", "passwordHash", "rol", "activo", "docenteId")
SELECT
  LOWER(SPLIT_PART("nombreCompleto", ' ', 1)) || '.' || "dni" || '@unt.edu.pe',
  '$2a$10$ch.NsL9FeW3xD8oMpdfYxe/hcLsiCAK4rp1pLDBHNV74aJo.VB/nu',
  'DOCENTE',
  true,
  "id"
FROM "docentes";


-- 8. Asignaciones Docente-Carrera
INSERT INTO "docente_carrera" ("docenteId", "carreraId")
SELECT
  d."id",
  c."id"
FROM "docentes" d, "carreras" c
WHERE c."nombre" = 'Ingeniería de Sistemas';


-- Mensaje de finalización
SELECT 'SEEDS COMPLETADOS!' AS mensaje;
