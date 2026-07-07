import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.render' });

import { Client } from 'pg';

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Conectado a BD');

  // Crear tabla si no existe
  await client.query(`
    CREATE TABLE IF NOT EXISTS "lugares" (
      "id" SERIAL PRIMARY KEY,
      "codigo" VARCHAR(3) NOT NULL UNIQUE,
      "nombre" VARCHAR(100) NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Tabla "lugares" creada/verificada');

  // Agregar columna lugarId a aulas si no existe
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'aulas' AND column_name = 'lugarId'
      ) THEN
        ALTER TABLE "aulas" ADD COLUMN "lugarId" INTEGER REFERENCES "lugares"("id") ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  console.log('Columna "lugarId" en aulas verificada');

  const lugares = [
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

  for (const [codigo, nombre] of lugares) {
    const res = await client.query('SELECT id FROM "lugares" WHERE codigo = $1', [codigo]);
    if (res.rows.length === 0) {
      await client.query('INSERT INTO "lugares" (codigo, nombre) VALUES ($1, $2)', [codigo, nombre]);
      console.log(`Insertado: ${codigo} - ${nombre}`);
    } else {
      console.log(`Ya existe: ${codigo} - ${nombre}`);
    }
  }

  await client.end();
  console.log('Seed completo');
}

seed().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
