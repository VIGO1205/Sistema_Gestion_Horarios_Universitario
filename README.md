# 🏛️ Sistema de Gestión de Horarios — UNT

**Plataforma integral para la gestión, planificación y asignación de la carga académica docente de la Escuela de Ingeniería de Sistemas de la Universidad Nacional de Trujillo.**

> Automatiza desde la programación de cursos y asignación de docentes hasta la generación de horarios, atención por ventanillas virtuales, reportes oficiales PDF y consultas con IA — todo en un solo ecosistema.

---

## 📦 Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router) + React 18 + TypeScript | Aplicación web SSR/SPA |
| **UI** | [MUI 5](https://mui.com/) (Material UI) + SweetAlert2 | Componentes con diseño institucional |
| **Estado/Server** | TanStack React Query | Cache y sincronización de datos |
| **Tiempo real** | Socket.IO (cliente) | Actualizaciones en vivo |
| **Gráficos** | Recharts | Estadísticas y occupancy maps |
| **Backend** | [NestJS](https://nestjs.com/) + TypeScript | API REST modular |
| **ORM** | TypeORM | Mapeo objeto-relacional |
| **Base de datos** | PostgreSQL 15 | Datos relacionales |
| **Autenticación** | JWT + Passport + bcrypt | Login seguro por roles |
| **IA / Chatbot** | Groq SDK (Llama 3.3 70B) | Asistente Horus |
| **Colas** | @nestjs/bull + Redis | Procesamiento asíncrono |
| **Tareas CRON** | @nestjs/schedule | Automatización de ventanillas |
| **PDF** | jsPDF + ExcelJS | Reportes oficiales UNT |
| **Docker** | Docker Compose | Entorno completo contenerizado |
| **WebSockets** | Socket.IO (servidor) | Namespaces: horarios, ventanas, notificaciones |

---

## ✨ Funcionalidades

### 🔐 Autenticación y Roles
- Login con JWT + bloqueo de cuenta tras 5 intentos fallidos (15 min)
- Tres roles: **ADMIN**, **COORDINADOR**, **DOCENTE**
- Protección de rutas por rol vía `@Roles()` decorator + `RolesGuard`

### 📋 Gestión de Carga Académica (Carga Lectiva)
Módulo central donde el coordinador gestiona toda la carga lectiva de los docentes. Se divide en dos grandes vistas:

**Programación de cursos por ciclo**
- Define horas teoría / práctica / laboratorio y número de grupos por curso
- Asignación batch (programación masiva) desde un solo panel

**Pestaña — Por Docente**
- Asigna docentes a cursos con horas semanales y grupos específicos
- Validación automática de límites reglamentarios (mín/máx de CHL según tipo de contrato, categoría y dedicación)
- Resumen de créditos asignados vs. programados con barra de progreso
- Visualización de carga completa del docente (lectiva + no lectiva + filial)

**Pestaña — Por Aula**
- Grilla semanal del aula con drag & drop desde tarjetas de cursos asignados
- Filtro inteligente por tipo de ambiente (aulas para teoría/práctica, laboratorios)
- Auto-creación de horario cuando solo queda 1 grupo disponible
- Cards que desaparecen al completar todos los grupos y reaparecen al eliminar
- Persistencia del aula seleccionada entre recargas (localStorage)
- Vista de disponibilidad del aula (ocupación actual)

> Aquí se registra **toda la carga lectiva** de los docentes (programación, asignación y horarios en aula).

### 📋 Carga No Lectiva (Autogestionada por el Docente)
Cada docente registra sus propias actividades no lectivas a través de un formulario dividido en rubros reglamentarios:

| Rubro | Actividades |
|---|---|
| **CHNL-PE** | Participación en eventos, asesoría de tesis, tutoría, comités académicos |
| **CHNL-C** | Proyección social, extensión universitaria, capacitación continua |
| **CHNL-A** | Administrativas: gestión académica, reuniones, comisiones institucionales |

**Validaciones automáticas:**
- Límite máximo de horas por rubro según tipo de contrato y categoría del docente
- La suma de CHL + CHNL + Filial no puede exceder la jornada máxima legal
- Cada actividad requiere: rubro, descripción, horas semanales, y en algunos casos día y hora específica
- Integración con el calendario semanal del docente para evitar cruces con su carga lectiva
- Las actividades sin día/hora fija se contabilizan solo como horas declaradas
- Estado de declaración: pendiente → firmado → aprobado (con reporte F01-CAD)

### 📋 Carga Adicional por Filial
Gestión de carga horaria asignada en sedes descentralizadas (filiales):
- El coordinador asigna cursos y horas a docentes en filiales
- Horario semanal propio con campos: curso, horas, día, aula, y grupo por filial
- Almacenado en formato JSONB para flexibilidad
- Se contabiliza dentro del total de horas del docente (CHL + CHNL + Filial ≤ jornada máxima)
- Generación del reporte oficial **F04-CAD** (Carga Horaria Asignada en Filiales)

### 📅 Vista Consolidada de Horarios (Solo Visual)
Panel de consulta unificado donde se visualiza la **carga horaria completa del docente**, integrando tanto su carga lectiva (registrada en Carga Académica) como su carga no lectiva (autogestionada por el docente) y carga filial. Es **únicamente visual** — no se realizan operaciones CRUD aquí.

- Grilla semanal con todas las actividades del docente en un solo vistazo
- Codificación por colores: teoría, práctica, laboratorio, no lectiva, filial
- Filtrar por ciclo académico y docente
- WebSocket en tiempo real: refleja cambios hechos desde Carga Académica o Ventanillas
- Validaciones visibles en la grilla (cruces de horario, exceso de horas diarias, horario de almuerzo)

### 🎫 Sistema de Ventanillas (Queue Management)
- Creación de ventanas de atención por ciclo académico
- Turnos ordenados jerárquicamente (nombrado/contratado × categoría)
- Temporizador automático por docente (configurable, ej. 10 min)
- **CRON** que cada minuto:
  - Finaliza turnos expirados y llama al siguiente
  - Notifica con 15 min y 5 min de anticipación
- **Efecto dominó**: cuando una ventana termina antes/tarde, todas las siguientes se recalculan automáticamente
- Control administrativo: saltar, extender, pausar/reanudar, forzar siguiente
- WebSocket en vivo: todos los docentes ven su turno y cuenta regresiva

### 🤖 Horus — Asistente IA
- Chatbot basado en Groq + Llama 3.3 70B
- 6 herramientas (function calling):
  - `getTeacherSchedule` — consultar horario de un docente
  - `getTeacherAssignments` — asignaciones de carga académica
  - `getTeacherNonTeachingLoad` — carga no lectiva
  - `getAvailableClassrooms` — aulas disponibles por día/hora
  - `getAulasInfo` — información de ambientes
  - `checkScheduleConflict` — verificar conflictos
- Privacidad: docentes solo ven su propia información
- Fallback entre 2 API keys para rate limiting
- Interfaz flotante o en sidebar

### 📄 Reportes Oficiales (4 Formatos UNT)
Generación de PDF con firma digital (base64):

| Formato | Nombre | Descripción |
|---|---|---|
| **F01-CAD** | Declaración de Carga Académica Docente | Tabla detallada con CHL + CHNL + totales |
| **F02-CAD** | Declaración Jurada de No Incompatibilidad | Texto de declaración jurada |
| **F03-CAD** | Horario Semanal de Carga Académica | Cuadrícula de horario semanal |
| **F04-CAD** | Carga Horaria Asignada en Filiales | Carga en sedes descentralizadas |

Además: reportes operativos (6 tipos) + reportes de gestión (3 tipos) + exportación Excel.

### 🧾 Reglamento UNT Incorporado
Módulo `reglamento-utils.ts` que codifica fielmente el reglamento oficial:
- Límites de carga para docentes ordinarios según dedicación (DE/TC/TP-20/10/08/04/16)
- Límites para contratados por tipo (a1/b1/a2/b2/a3/b3)
- Límites para Jefes de Práctica según dedicación
- Cálculo de CHL mín/máx, CHNLPE, CHNLC por rubro, CHNLA, y total jornada

### 👥 Administración de Maestros
- CRUD completo de docentes con creación automática de cuenta de usuario
- Asignación de carreras (many-to-many)
- Cálculo automático de antigüedad desde la fecha de contratación
- Filtros por condición, categoría, carrera y estado activo
- Validación de carga completa (lectiva + no lectiva + filial)

### 🎓 Cursos y Mallas Curriculares
- CRUD de cursos con importación masiva desde PDF (malla curricular) usando IA
- Asignación batch de carreras a cursos
- Vinculación a currículas

### 🏢 Ambientes (Aulas y Laboratorios)
- CRUD de ambientes con tipo (teoría, práctica, laboratorio)
- Filtro inteligente que condiciona qué tarjetas de asignación se muestran
- Mapa de ocupación por ciclo y aula

### 📊 Dashboard
- Estadísticas globales: total docentes, horarios, ambientes
- Gráficos de ocupación por día (Recharts)
- Vista personalizada para docentes con su resumen

---

## 🐳 Despliegue con Docker

### Requisitos
- Docker Engine ≥ 24
- Docker Compose ≥ 2.20

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto (usa `.env.example` como referencia):

```env
# Base de datos
POSTGRES_USER=universidad_admin
POSTGRES_PASSWORD=S3cur3P@ssw0rd!
POSTGRES_DB=horarios_unt
DATABASE_URL=postgresql://universidad_admin:S3cur3P@ssw0rd!@db:5432/horarios_unt

# Backend
PORT=3001
JWT_SECRET=tu_jwt_secret_aqui
API_URL=http://backend:3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001

# IA (opcional — para el chatbot Horus)
GROQ_API_KEY=gsk_tu_key_aqui
GROQ_API_KEY_2=gsk_tu_key_respaldo_aqui

# Redis (opcional — para colas Bull)
REDIS_HOST=redis
REDIS_PORT=6379

# Correo (opcional — para notificaciones)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/VIGO1205/Sistema_Gestion_Horarios_Universitario.git
cd Sistema_Gestion_Horarios_Universitario

# 2. Crear archivo .env (o copiar .env.example)

# 3. Iniciar todos los servicios
docker compose up -d --build

# 4. Poblar la base de datos con datos de prueba (seed)
docker compose exec backend npm run seed

# 5. Acceder
#    Frontend:  http://localhost:3000
#    Backend:   http://localhost:3001
#    pgAdmin:   http://localhost:5050 (admin@unt.edu.pe / admin123)
```

### Usuarios por Defecto (Seed)

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@unt.edu.pe` | `Admin123` |
| Coordinador | `coordinador@unt.edu.pe` | `Coord123` |
| Docente (ejemplo) | `juan.perez@unt.edu.pe` | `Docente123` |

### Servicios

| Servicio | Puerto | Descripción |
|---|---|---|
| `db` | 5432 | PostgreSQL 15 |
| `backend` | 3001 | API NestJS |
| `frontend` | 3000 | UI Next.js 14 |
| `pgadmin` | 5050 | Administrador BD web |

### Comandos Útiles

```bash
# Ver logs de un servicio
docker compose logs -f backend

# Ejecutar seed nuevamente
docker compose exec backend npm run seed

# Acceder a la base de datos
docker compose exec db psql -U universidad_admin -d horarios_unt

# Reconstruir sin cache
docker compose build --no-cache
docker compose up -d
```

---

## 🧱 Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)             │
│  ┌───────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  MUI 5 UI │ │ React    │ │ Socket.IO Client  │   │
│  │  Theme    │ │ Query    │ │ (horarios/        │   │
│  │  #003366  │ │          │ │  ventanas/notif)  │   │
│  └───────────┘ └──────────┘ └──────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP REST + WebSocket
┌──────────────────────▼──────────────────────────────┐
│               Backend (NestJS)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │ Auth     │ │ Horarios │ │ Ventanas (Queue)  │    │
│  │ Module   │ │ Module   │ │ Module            │    │
│  ├──────────┤ ├──────────┤ ├──────────────────┤    │
│  │ Docentes │ │ Cursos   │ │ Reportes (PDF)    │    │
│  │ Module   │ │ Module   │ │ Module            │    │
│  ├──────────┤ ├──────────┤ ├──────────────────┤    │
│  │ IA/Horus │ │ Carga    │ │ Carga No Lectiva  │    │
│  │ Module   │ │ Acad.    │ │ Module            │    │
│  └──────────┘ └──────────┘ └──────────────────┘    │
│  ┌──────────────────────────────────────────────┐   │
│  │ TypeORM + Guards + WebSocket Gateway + CRON  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ TypeORM
┌──────────────────────▼──────────────────────────────┐
│              PostgreSQL 15                            │
│  20+ entidades: Horarios, Docentes, Cursos, Aulas,   │
│  Ventanas, Grupos, Asignaciones, Notificaciones...   │
└─────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
├── backend/                    # API NestJS
│   └── src/
│       ├── main.ts             # Bootstrap
│       ├── app.module.ts       # Módulo raíz
│       ├── common/             # Guards, decorators, constantes
│       ├── database/           # Entidades TypeORM, seed
│       └── modules/            # 19 módulos funcionales
├── frontend/                   # UI Next.js 14
│   └── app/
│       ├── layout.tsx          # Layout global + sidebar
│       ├── page.tsx            # Login
│       ├── dashboard/          # Estadísticas
│       ├── horarios/           # Grilla horarios
│       ├── carga-academica/    # Carga (docente + aula)
│       ├── ventanas/           # Ventanillas
│       ├── reportes/           # Reportes oficiales
│       ├── docentes/           # CRUD docentes
│       ├── cursos/             # CRUD cursos
│       ├── ambientes/          # CRUD aulas
│       ├── carreras/           # CRUD carreras
│       ├── curriculas/         # CRUD currículas
│       ├── periodos/           # CRUD ciclos
│       ├── usuarios/           # Gestión usuarios
│       ├── perfil/             # Perfil usuario
│       ├── components/         # Componentes compartidos
│       └── lib/                # Utilidades (api, socket, reglamento)
├── docker-compose.yml          # Orquestación Docker
└── README.md
```

---

## 👨‍💻 Desarrollo Local

```bash
# Backend
cd backend
npm install
npm run start:dev     # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev           # http://localhost:3000

# Base de datos (requiere PostgreSQL local o Docker)
docker compose up -d db
```

---

## 🧪 Datos de Prueba

El seed incluye:
- **5 ciclos académicos** (2024-I al 2026-I)
- **4 carreras**: Ingeniería de Sistemas, Industrial, Medicina, Derecho
- **22 docentes** realistas con distintos tipos de contrato y categorías
- **16+ ambientes** (aulas teoría, práctica y laboratorios)
- Usuarios admin, coordinador y docentes

Ejecutar: `docker compose exec backend npm run seed`

---

## 📄 Licencia

Uso institucional — Universidad Nacional de Trujillo.
Facultad de Ingeniería — Escuela de Ingeniería de Sistemas.
