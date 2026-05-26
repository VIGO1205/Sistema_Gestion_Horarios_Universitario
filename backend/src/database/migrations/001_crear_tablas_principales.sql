-- Migration: 001_crear_tablas_principales
-- Descripción: Crear estructura base de docentes, cursos, ambientes y horarios

-- Tabla de docentes con jerarquía y antigüedad
CREATE TABLE docentes (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(200) NOT NULL,
    tipo_contrato VARCHAR(20) CHECK (tipo_contrato IN ('nombrado', 'contratado')),
    categoria VARCHAR(30) CHECK (categoria IN ('principal', 'asociado', 'auxiliar', 'jefe_practica')),
    antiguedad_anios INTEGER DEFAULT 0,
    fecha_ingreso DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para ordenación jerárquica rápida
CREATE INDEX idx_docentes_jerarquia ON docentes (tipo_contrato, categoria, antiguedad_anios DESC);
CREATE INDEX idx_docentes_activos ON docentes (activo) WHERE activo = true;

-- Tabla de cursos (teoría/lab)
CREATE TABLE cursos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('teoria', 'laboratorio', 'ambos')),
    horas_semanales INTEGER DEFAULT 4,
    ciclo_academico VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asignación docente-curso (previo a horarios)
CREATE TABLE asignacion_docente_curso (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER REFERENCES docentes(id) ON DELETE CASCADE,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    tipo_clase VARCHAR(20) CHECK (tipo_clase IN ('teoria', 'laboratorio')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(docente_id, curso_id, tipo_clase)
);

-- Aulas y laboratorios
CREATE TABLE ambientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('aula_teoria', 'laboratorio_redes', 'laboratorio_software', 'aula_especial')),
    capacidad INTEGER DEFAULT 30,
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Horarios generados (registro principal)
CREATE TABLE horarios (
    id SERIAL PRIMARY KEY,
    docente_id INTEGER REFERENCES docentes(id) ON DELETE CASCADE,
    curso_id INTEGER REFERENCES cursos(id) ON DELETE CASCADE,
    ambiente_id INTEGER REFERENCES ambientes(id) ON DELETE CASCADE,
    tipo_clase VARCHAR(20),
    dia_semana INTEGER CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    ciclo_academico VARCHAR(20) NOT NULL,
    es_automatico BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Restricciones para evitar cruces
    CONSTRAINT horarios_no_cruce_ambiente UNIQUE (ambiente_id, dia_semana, hora_inicio, hora_fin, ciclo_academico),
    CONSTRAINT horarios_no_cruce_docente UNIQUE (docente_id, dia_semana, hora_inicio, hora_fin, ciclo_academico)
);

-- Índices para búsqueda rápida en validaciones
CREATE INDEX idx_horarios_docente_curso ON horarios (docente_id, curso_id);
CREATE INDEX idx_horarios_ambiente_dia ON horarios (ambiente_id, dia_semana);
CREATE INDEX idx_horarios_ciclo ON horarios (ciclo_academico);

-- Vista materializada para dashboard rápido
CREATE MATERIALIZED VIEW mv_estadisticas_horarios AS
SELECT 
    ciclo_academico,
    COUNT(DISTINCT docente_id) as total_docentes_asignados,
    COUNT(DISTINCT curso_id) as total_cursos,
    COUNT(*) as total_horas_asignadas,
    AVG(EXTRACT(HOUR FROM (hora_fin - hora_inicio))) as promedio_horas_por_bloque
FROM horarios
GROUP BY ciclo_academico;

-- Índice en la vista materializada
CREATE INDEX idx_mv_estadisticas_ciclo ON mv_estadisticas_horarios (ciclo_academico);
