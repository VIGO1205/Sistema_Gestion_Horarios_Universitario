import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFParser = require('pdf2json');

@Injectable()
export class IAService {
  private groq: Groq;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.groq = new Groq({ apiKey: apiKey || 'dummy-key' });
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
    const prompt = `
      Eres un experto en extracción de datos académicos. Tu tarea es extraer la lista de cursos de una malla curricular.
      El texto proviene de un PDF y puede estar un poco desordenado.
      Extrae los siguientes campos para cada curso en formato JSON:
      - codigo (string)
      - nombre (string)
      - creditos (number)
      - cicloAcademico (string, solo el número, ej: "1", "2", etc.)

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

      IMPORTANTE:
      - Responde ÚNICAMENTE con un JSON válido.
      - El JSON debe ser un objeto con una propiedad "cursos" que sea un array de objetos.
      - Si no puedes encontrar cursos, devuelve {"cursos": []}.
      - No incluyas explicaciones ni texto adicional fuera del JSON.

      Texto de la malla curricular:
      ${text}
    `;

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = chatCompletion.choices[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      return Array.isArray(parsed.cursos) ? parsed.cursos : [];
    } catch (error) {
      console.error('Error con Groq API:', error);
      throw new InternalServerErrorException('Error al procesar la malla con IA. Verifica tu GROQ_API_KEY.');
    }
  }
}
