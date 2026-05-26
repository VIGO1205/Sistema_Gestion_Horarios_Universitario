-- Crear tabla de relación Many-to-Many entre docentes y carreras
CREATE TABLE IF NOT EXISTS docente_carrera (
  id SERIAL PRIMARY KEY,
  docente_id INTEGER NOT NULL,
  carrera_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  CONSTRAINT fk_docente_carrera_docente 
    FOREIGN KEY (docente_id) 
    REFERENCES docentes(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_docente_carrera_carrera 
    FOREIGN KEY (carrera_id) 
    REFERENCES carreras(id) 
    ON DELETE CASCADE,
  
  -- Evitar duplicados
  CONSTRAINT uk_docente_carrera_unique 
    UNIQUE(docente_id, carrera_id)
);

-- Crear índices para mejorar búsquedas
CREATE INDEX idx_docente_carrera_docente ON docente_carrera(docente_id);
CREATE INDEX idx_docente_carrera_carrera ON docente_carrera(carrera_id);
