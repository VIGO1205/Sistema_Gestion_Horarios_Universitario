-- clean-ventanas.sql
-- Script seguro para limpiar el estado de Ventanas de Atención y dejar la BD lista para pruebas.
-- Incluye: borrar ventanas, borrar notificaciones relacionadas, limpiar campos de docentes (incluye camelCase), y reiniciar la secuencia de ids.
-- Uso: ejecutar este archivo contra la BD (psql -U <user> -d <db> -f clean-ventanas.sql) o copiarlo al contenedor y ejecutarlo.

BEGIN;

-- 1) Eliminar todas las ventanas de atención (estado, pausado, etc.)
DELETE FROM ventanas_atencion;

-- 2) Eliminar notificaciones relacionadas con turnos/recordatorios para evitar mensajes obsoletos
DELETE FROM notificaciones WHERE tipo IN ('turno_activo','recordatorio_15min','recordatorio_24h');

-- 3) Limpiar campos en docentes: ventana_id, inicioAtencion, finAtencion y restablecer estadoSeleccion a 'en_espera'
UPDATE docentes
SET "ventana_id" = NULL,
    "inicioAtencion" = NULL,
    "finAtencion" = NULL,
    "estadoSeleccion" = 'en_espera'
WHERE TRUE;

-- 4) Reiniciar la secuencia de ventanas_atencion.id de forma segura.
-- Si la tabla está vacía fijar la secuencia para que nextval devuelva 1.
-- Si hay filas, fijar la secuencia a MAX(id) y marcarla como llamada para que nextval devuelva MAX(id)+1.
DO $$
DECLARE
    m integer;
    seq text := pg_get_serial_sequence('ventanas_atencion','id');
BEGIN
    SELECT MAX(id) INTO m FROM ventanas_atencion;
    IF m IS NULL THEN
        PERFORM setval(seq, 1, false); -- nextval -> 1
    ELSE
        PERFORM setval(seq, m, true); -- nextval -> m+1
    END IF;
END$$;

COMMIT;

-- Verificaciones (salida para confirmar estado)
SELECT COUNT(*) AS ventanas_count FROM ventanas_atencion;
SELECT COUNT(*) AS notificaciones_relevantes FROM notificaciones WHERE tipo IN ('turno_activo','recordatorio_15min','recordatorio_24h');
SELECT COUNT(*) AS docentes_con_ventana FROM docentes WHERE "ventana_id" IS NOT NULL;
SELECT COUNT(*) AS docentes_reset FROM docentes WHERE "inicioAtencion" IS NULL AND "finAtencion" IS NULL AND "estadoSeleccion"='en_espera';
