import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { HorariosService } from '../horarios/horarios.service';
import { DocentesService } from '../docentes/docentes.service';
import { AulasService } from '../aulas/aulas.service';
import { CiclosService } from '../ciclos/ciclos.service';
import { ProgramacionesService } from '../programaciones/programaciones.service';
import { CargaNoLectivaService } from '../carga-no-lectiva/carga-no-lectiva.service';
import { Docente } from '../../entities/docente.entity';
import { Horario } from '../../entities/horario.entity';
import { RolUsuario } from '../../entities/usuario.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFParser = require('pdf2json');

@Injectable()
export class IAService {
  private groqClients: Groq[];
  private readonly logger = new Logger(IAService.name);

  private formatGrupo(numero: number | undefined | null): string {
    if (!numero) return 'A';
    // 1=A, 2=B, 3=C, etc.
    return String.fromCharCode(64 + numero);
  }

  constructor(
    private configService: ConfigService,
    private horariosService: HorariosService,
    private docentesService: DocentesService,
    private aulasService: AulasService,
    private ciclosService: CiclosService,
    private programacionesService: ProgramacionesService,
    private cargaNoLectivaService: CargaNoLectivaService,
  ) {
    const apiKeys = [
      this.configService.get<string>('GROQ_API_KEY'),
      this.configService.get<string>('GROQ_API_KEY_2'),
    ].filter(Boolean) as string[];
    this.groqClients = apiKeys.length > 0
      ? apiKeys.map(key => new Groq({ apiKey: key }))
      : [new Groq({ apiKey: 'dummy-key' })];
  }

  async chat(message: string, history: any[] = [], context: any = {}): Promise<any> {
    const cicloActual = await this.ciclosService.asegurarCicloActual();
    let docenteAutenticado: Docente | null = null;

    if (context.docenteId) {
      try {
        docenteAutenticado = await this.docentesService.findOne(context.docenteId);
      } catch (e) {
        this.logger.error(
          `No se pudo cargar datos del docente ${context.docenteId} para el contexto de IA`,
          e.stack,
        );
      }
    }

    const tools: any[] = [
      {
        type: 'function',
        function: {
          name: 'getTeacherSchedule',
          description: 'Obtiene el horario completo de un docente por su nombre o parte del nombre.',
          parameters: {
            type: 'object',
            properties: {
              nombreDocente: { type: 'string', description: 'Nombre completo o parcial del docente' },
            },
            required: ['nombreDocente'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getTeacherAssignments',
          description: 'Obtiene la carga académica (cursos asignados) de un docente, incluso si aún no tienen horario.',
          parameters: {
            type: 'object',
            properties: {
              nombreDocente: { type: 'string', description: 'Nombre completo o parcial del docente' },
            },
            required: ['nombreDocente'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getTeacherNonTeachingLoad',
          description: 'Obtiene la carga no lectiva (preparación, tutoría, investigación, etc.) de un docente.',
          parameters: {
            type: 'object',
            properties: {
              nombreDocente: { type: 'string', description: 'Nombre completo o parcial del docente' },
            },
            required: ['nombreDocente'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getAvailableClassrooms',
          description: 'Consulta qué aulas están libres en un día y rango de horas específico.',
          parameters: {
            type: 'object',
            properties: {
              dia: { type: 'integer', description: 'Día de la semana (1: Lunes, ..., 6: Sábado)' },
              horaInicio: { type: 'string', description: 'Hora inicio en formato HH:mm:ss' },
              horaFin: { type: 'string', description: 'Hora fin en formato HH:mm:ss' },
            },
            required: ['dia', 'horaInicio', 'horaFin'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getAulasInfo',
          description: 'Obtiene la lista de todas las aulas y su estado de disponibilidad general.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'checkScheduleConflict',
          description: 'Verifica si existe un cruce de horario para un docente o un aula en un momento específico.',
          parameters: {
            type: 'object',
            properties: {
              dia: { type: 'integer', description: '1:Lunes...6:Sábado' },
              horaInicio: { type: 'string', description: 'HH:mm:ss' },
              horaFin: { type: 'string', description: 'HH:mm:ss' },
              aulaId: { type: 'integer', description: 'ID del aula' },
              nombreAula: { type: 'string', description: 'Nombre del aula (si no se tiene el ID)' },
              nombreDocente: { type: 'string', description: 'Nombre del docente opcional' },
            },
            required: ['dia', 'horaInicio', 'horaFin'],
          },
        },
      },
    ];

    const messages: any[] = [
      {
        role: 'system',
        content: `Eres HORUS, el asistente inteligente de gestión de horarios de la Universidad Nacional de Trujillo (UNT).
        Tu objetivo es ayudar a los docentes y administradores a consultar horarios, aulas y disponibilidad.
        
        CONTEXTO ACTUAL:
        - Ciclo Académico: ${cicloActual.nombre} (ID: ${cicloActual.id})
        - Fecha de hoy: ${new Date().toLocaleDateString()}
        ${docenteAutenticado ? `- DOCENTE AUTENTICADO: ${docenteAutenticado.nombreCompleto} (ID: ${docenteAutenticado.id})` : ''}
        
        REGLAS:
        - Si no estás seguro de algo, pregunta.
        - Usa las herramientas disponibles para obtener datos reales de la base de datos.
        - Si el usuario pregunta por "mis horarios", "mis cursos" o algo personal, utiliza el DOCENTE AUTENTICADO arriba mencionado para llamar a las funciones correspondientes sin volver a preguntarle su nombre.
        - RESTRICCIÓN DE PRIVACIDAD: Si el usuario es un DOCENTE, tiene las siguientes prohibiciones y permisos:
            - PROHIBIDO: Consultar la carga académica (lectiva o no lectiva) de otro docente, o pedir un listado completo de sus cursos.
            - PERMITIDO: Saber quién ocupa un aula en un horario específico para detectar cruces. Es decir, si el aula está ocupada, puedes mencionar el nombre del docente y el curso/grupo que la está usando para justificar el conflicto.
        - Si el usuario es ADMIN o COORDINADOR, puede consultar la información de cualquier docente.
        - PRIORIDAD DE CONSULTA: Si un docente pregunta por sus cursos o qué debe dictar, usa primero "getTeacherAssignments" para ver su carga académica lectiva, y "getTeacherNonTeachingLoad" para su carga no lectiva. Luego usa "getTeacherSchedule" si necesita saber las horas exactas ya programadas.
        - ENTENDIMIENTO DE TÉRMINOS: "Carga no lectiva" puede aparecer como "no le activa" o variaciones similares. Debes entender que se refiere a actividades como investigación, tutoría, etc.
        - COMPARACIÓN DE CARGA: Para saber si algo "falta asignar", debes llamar a "getTeacherNonTeachingLoad" (para ver qué debe hacer) y compararlo con "getTeacherSchedule" (para ver qué ya está en el grid). Si las horas en el horario son menores a las asignadas, falta disponibilidad.
        - MANEJO DE GRUPOS: Los cursos se dividen en grupos identificados por letras (A, B, C, etc.). Debes usar siempre estas letras al referirte a los grupos.
        - VERIFICACIÓN DE AULAS: NUNCA inventes nombres de aulas. Antes de confirmar que un aula está disponible o de hablar de ella, verifica que existe usando "getAulasInfo" o "checkScheduleConflict". Si el usuario menciona un aula que no existe, infórmale educadamente.
        - DETECCIÓN DE CRUCES: Si el usuario propone un horario o pregunta por disponibilidad, usa "checkScheduleConflict" para verificar tanto su propia agenda (lectiva y no lectiva) como la ocupación del aula por otros docentes.
        - MANEJO DE DOCENTE SIN CURSOS: Si al consultar "getTeacherAssignments" para un docente autenticado, el resultado es vacío o no tiene cursos asignados, indícale claramente que "no tiene cursos asignados para el periodo actual ${cicloActual.nombre}" en lugar de decir que no tienes información sobre sus cursos. Esto evita confusiones.
        - Responde de forma amable y profesional. No menciones el nombre de las funciones internas que utilizas.
        - Los días de la semana son: 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado.
        - Las horas deben estar en formato 24h (ej: "15:00:00").`,
      },
      ...history,
      { role: 'user', content: message },
    ];

    try {
      let response = await this.groqClients[0].chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.3,
      });

      let responseMessage = response.choices[0].message;

      // Manejar llamadas a funciones
      if (responseMessage.tool_calls) {
        messages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          let functionArgs: any = {};
          
          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            this.logger.error(`Error parseando argumentos de función ${functionName}:`, toolCall.function.arguments);
          }

          let functionResponse: any;

          this.logger.log(`IA llamando a función: ${functionName} con argumentos: ${JSON.stringify(functionArgs)}`);

          try {
            if (functionName === 'getTeacherSchedule') {
              const docentes = await this.docentesService.findAll({ search: functionArgs.nombreDocente });
              if (docentes.length === 0) {
                functionResponse = { error: `No se encontró al docente "${functionArgs.nombreDocente}"` };
              } else {
                const docente = docentes[0];

                if (context.rol === RolUsuario.DOCENTE && docente.id !== context.docenteId) {
                  functionResponse = {
                    error: `No tienes permisos para ver el horario del docente "${docente.nombreCompleto}". Como docente, solo puedes consultar tu propio horario.`,
                  };
                } else {
                  const horarios = await this.horariosService.findAll({
                    docenteId: docente.id,
                    cicloId: cicloActual.id,
                  });
                  functionResponse = {
                  docente: docente.nombreCompleto,
                  horarios: horarios.map((h) => ({
                    curso: h.curso?.nombre,
                    aula: h.aula?.nombre,
                    dia: h.diaSemana,
                    inicio: h.horaInicio,
                    fin: h.horaFin,
                    tipo: h.tipoClase,
                    actividad: h.actividadNoLectiva,
                    grupo: this.formatGrupo(h.grupo?.numeroGrupo),
                  })),
                };
                }
              }
            } else if (functionName === 'getTeacherAssignments') {
              const docentes = await this.docentesService.findAll({ search: functionArgs.nombreDocente });
              if (docentes.length === 0) {
                functionResponse = { error: `No se encontró al docente "${functionArgs.nombreDocente}"` };
              } else {
                const docente = docentes[0];

                if (context.rol === RolUsuario.DOCENTE && docente.id !== context.docenteId) {
                  functionResponse = {
                    error: `No tienes permisos para ver la carga académica del docente "${docente.nombreCompleto}".`,
                  };
                } else {
                  const asignaciones = await this.programacionesService.findAssignmentsByDocente(
                    docente.id,
                    cicloActual.id,
                  );
                  functionResponse = {
                    docente: docente.nombreCompleto,
                    cargaAcademica: asignaciones.map((a) => ({
                    curso: a.curso?.nombre,
                    codigo: a.curso?.codigo,
                    tipo: a.tipoClase,
                    horas: a.horasSemanales,
                    grupos: a.grupos?.map(g => ({
                      nombre: this.formatGrupo(g.numeroGrupo),
                      yaTieneHorario: g.horarios && g.horarios.length > 0
                    })) || [],
                  })),
                };
                }
              }
            } else if (functionName === 'getTeacherNonTeachingLoad') {
              const docentes = await this.docentesService.findAll({ search: functionArgs.nombreDocente });
              if (docentes.length === 0) {
                functionResponse = { error: `No se encontró al docente "${functionArgs.nombreDocente}"` };
              } else {
                const docente = docentes[0];

                if (context.rol === RolUsuario.DOCENTE && docente.id !== context.docenteId) {
                  functionResponse = {
                    error: `No tienes permisos para ver la carga no lectiva del docente "${docente.nombreCompleto}".`,
                  };
                } else {
                  const cargaNoLectiva: any = await this.cargaNoLectivaService.findByDocenteAndCiclo(
                    docente.id,
                    cicloActual.id,
                  );
                  functionResponse = {
                    docente: docente.nombreCompleto,
                    cargaNoLectiva: {
                      preparacionEvaluacion: cargaNoLectiva.horasPreparacion,
                      tutoria: cargaNoLectiva.horasTutoria,
                      investigacion: cargaNoLectiva.horasInvestigacion,
                      capacitacion: cargaNoLectiva.horasCapacitacion,
                      gobierno: cargaNoLectiva.horasGobierno,
                      administracion: cargaNoLectiva.horasAdministracion,
                      asesoria: cargaNoLectiva.horasAsesoria,
                      responsabilidadSocial: cargaNoLectiva.horasResponsabilidadSocial,
                      comites: cargaNoLectiva.horasComites,
                      totalHoras: cargaNoLectiva.totalHorasNonLectiva,
                    }
                  };
                }
              }
            } else if (functionName === 'getAvailableClassrooms') {
              const allHorarios = await this.horariosService.findAll({ cicloId: cicloActual.id });
              const allAulas = await this.aulasService.findAll();

              // Filtrar aulas ocupadas en ese rango
              const ocupadas = allHorarios
                .filter(
                  (h) =>
                    h.diaSemana === functionArgs.dia &&
                    !(h.horaFin <= functionArgs.horaInicio || h.horaInicio >= functionArgs.horaFin),
                )
                .map((h) => h.aulaId);

              const disponibles = allAulas.filter((a) => !ocupadas.includes(a.id) && a.disponible);

              functionResponse = disponibles.map((a) => ({ id: a.id, nombre: a.nombre, tipo: a.tipo }));
            } else if (functionName === 'getAulasInfo') {
              const aulas = await this.aulasService.findAll();
            functionResponse = aulas.map((a) => ({ nombre: a.nombre, tipo: a.tipo, disponible: a.disponible }));
          } else if (functionName === 'checkScheduleConflict') {
            const allHorarios = await this.horariosService.findAll({ cicloId: cicloActual.id });
            const { dia, horaInicio, horaFin, aulaId, nombreAula, nombreDocente } = functionArgs;
            
            let finalAulaId = aulaId;
            let finalNombreAula = '';

            if (!finalAulaId && nombreAula) {
              const allAulas = await this.aulasService.findAll();
              const aulaEncontrada = allAulas.find(a => a.nombre.toLowerCase().includes(nombreAula.toLowerCase()));
              if (aulaEncontrada) {
                finalAulaId = aulaEncontrada.id;
                finalNombreAula = aulaEncontrada.nombre;
              } else {
                functionResponse = { 
                  error: `El aula "${nombreAula}" no existe en el sistema. Por favor, verifica el nombre o consulta la lista de aulas.` 
                };
                return; // Salir del bloque si no existe
              }
            } else if (finalAulaId) {
              const allAulas = await this.aulasService.findAll();
              const aulaEncontrada = allAulas.find(a => a.id === finalAulaId);
              finalNombreAula = aulaEncontrada ? aulaEncontrada.nombre : 'Aula desconocida';
            }

            const crucesAula: Horario[] = finalAulaId ? allHorarios.filter(h => 
              h.aulaId === finalAulaId && h.diaSemana === dia && 
              !(h.horaFin <= horaInicio || h.horaInicio >= horaFin)
            ) : [];

            let docenteIdAVerificar = context.docenteId;
            let nombreDocenteAVerificar = docenteAutenticado?.nombreCompleto;

            if (nombreDocente && (context.rol === RolUsuario.ADMIN || context.rol === RolUsuario.COORDINADOR)) {
              const docentes = await this.docentesService.findAll({ search: nombreDocente });
              if (docentes.length > 0) {
                docenteIdAVerificar = docentes[0].id;
                nombreDocenteAVerificar = docentes[0].nombreCompleto;
              }
            }

            const crucesDocente: Horario[] = docenteIdAVerificar ? allHorarios.filter(h => 
              h.docenteId === docenteIdAVerificar && h.diaSemana === dia && 
              !(h.horaFin <= horaInicio || h.horaInicio >= horaFin)
            ) : [];

            functionResponse = {
              hayConflicto: crucesAula.length > 0 || crucesDocente.length > 0,
              aulaExiste: true,
              detallesAula: crucesAula.map(c => ({ docente: c.docente?.nombreCompleto, curso: c.curso?.nombre, grupo: this.formatGrupo(c.grupo?.numeroGrupo) })),
              detallesDocente: crucesDocente.map(c => ({ aula: c.aula?.nombre, curso: c.curso?.nombre, grupo: this.formatGrupo(c.grupo?.numeroGrupo) })),
              mensaje: crucesAula.length > 0 
                ? `El aula ${finalNombreAula} ya está ocupada por el grupo ${this.formatGrupo(crucesAula[0]?.grupo?.numeroGrupo)} del curso ${crucesAula[0]?.curso?.nombre} (${crucesAula[0]?.docente?.nombreCompleto})` 
                : (crucesDocente.length > 0 ? `Tú ya tienes clase con el grupo ${this.formatGrupo(crucesDocente[0]?.grupo?.numeroGrupo)} del curso ${crucesDocente[0]?.curso?.nombre}` : `El horario en ${finalNombreAula} está disponible`)
            };
          }
        } catch (error) {
            this.logger.error(`Error ejecutando herramienta ${functionName}:`, error);
            functionResponse = { error: `Hubo un error interno al ejecutar la consulta de ${functionName}.` };
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(functionResponse),
          });
        }

        // Obtener respuesta final después de las herramientas
        response = await this.groqClients[0].chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
        });
        responseMessage = response.choices[0].message;
      }

      return {
        role: 'assistant',
        content: responseMessage.content,
      };
    } catch (error) {
      this.logger.error('Error en chat con Groq:', error);
      throw new InternalServerErrorException('Error al procesar el chat con HORUS.');
    }
  }

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('Error parsing PDF:', errData.parserError);
        reject(new InternalServerErrorException('Error al extraer texto del PDF'));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        const text = pdfParser.getRawTextContent();
        resolve(text);
      });

      pdfParser.parseBuffer(buffer);
    });
  }

  async parseCursosFromText(text: string): Promise<any[]> {
    // Truncar texto para no exceder límite de tasa gratuita (12k TPM)
    const maxTextLength = 12000;
    const truncatedText = text.length > maxTextLength
      ? text.substring(0, maxTextLength) + '\n[... texto truncado por longitud ...]'
      : text;

    const prompt = `
      Eres un experto en extracción de datos académicos. Tu tarea es extraer la lista de cursos de una malla curricular.
      El texto proviene de un PDF y puede estar un poco desordenado.
      Extrae los siguientes campos para cada curso en formato JSON:
      - codigo (string)
      - nombre (string)
      - creditos (number)
      - cicloAcademico (string, solo el número, ej: "1", "2", etc.)
      - departamento (string, el departamento o área al que pertenece el curso, ej: "Ciencias Básicas", "Ingeniería de Sistemas", "General", etc. Si no lo encuentras, usa "General")
      - tipoCurso (string, opcional) — el tipo de curso según la malla: "ES" (Estudio Específico), "EL" (Electivo), "OB" (Obligatorio), "OP" (Otro). Si la malla lo indica, extráelo; si no, no lo incluyas o déjalo como null.

      REGLAS IMPORTANTES PARA TABLAS:
      - El código del curso debe tener exactamente 4 dígitos numéricos (ej: "1939", "2347").
      - Si el texto trae más caracteres en el código (letras, guiones o espacios), limpia y conserva solo los 4 dígitos válidos.
      - Si no puedes obtener un código de 4 dígitos con confianza, deja codigo como cadena vacía "".
      - En muchas mallas, la columna de créditos puede aparecer como "C", "CR", "Cred", "Créditos" o "Creditos".
      - Si aparece una columna con esos títulos, ese valor corresponde a "creditos".
      - No confundas "ciclo" con "creditos".
      - Si el valor viene como texto (ej: "4 créditos", "C=3", "03"), normalízalo a número entero (4, 3, 3).
      - Si hay duda entre ciclo y créditos, prioriza el encabezado de la columna de la tabla.
      - Rango esperado de créditos: normalmente entre 1 y 6.
      - Si no puedes inferir créditos con confianza, usa 0 para que luego se corrija en la previsualización.
      - Para "departamento": busca en el texto menciones a departamentos, áreas o facultades. Si no encuentras información, usa "General".

      IMPORTANTE:
      - La malla completa tiene aproximadamente 90 cursos. Asegúrate de extraerlos TODOS sin omitir ninguno. Se espera una lista de entre 80 y 100 cursos.
      - Si el JSON se corta por longitud, prioriza completar la lista antes que cualquier otra cosa.
      - Responde ÚNICAMENTE con un JSON válido.
      - El JSON debe ser un objeto con una propiedad "cursos" que sea un array de objetos.
      - Si no puedes encontrar cursos, devuelve {"cursos": []}.
      - No incluyas explicaciones ni texto adicional fuera del JSON.

      Texto de la malla curricular:
      ${truncatedText}
    `;

    let lastError: unknown;

    for (let i = 0; i < this.groqClients.length; i++) {
      try {
        const chatCompletion = await this.groqClients[i].chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 7000,
          response_format: { type: 'json_object' },
        });

        const content = chatCompletion.choices[0]?.message?.content;
        if (!content) return [];

        const parsed = JSON.parse(content);
        return Array.isArray(parsed.cursos) ? parsed.cursos : [];
      } catch (error) {
        lastError = error;
        const isRateLimit =
          error?.code === 'rate_limit_exceeded' ||
          error?.status === 429 ||
          error?.message?.includes('rate_limit');

        if (isRateLimit) {
          this.logger.warn(`Groq key ${i + 1} rate limited, trying next key...`);
          continue;
        }

        if (i < this.groqClients.length - 1) {
          this.logger.warn(`Groq key ${i + 1} failed with non-rate-limit error, trying next key...`);
          continue;
        }
      }
    }

    console.error('Error con Groq API:', lastError);
    throw new InternalServerErrorException('Error al procesar la malla con IA. Verifica tu GROQ_API_KEY.');
  }

}
