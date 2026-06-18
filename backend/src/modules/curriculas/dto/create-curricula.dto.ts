export class CreateCurriculaDto {
  nombre: string;
  anio: number;
  descripcion?: string;
  carreraId: number;
  pdfArchivo?: string;
}
