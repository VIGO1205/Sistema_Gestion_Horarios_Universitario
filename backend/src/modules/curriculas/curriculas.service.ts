import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curricula } from './entities/curricula.entity';
import { CreateCurriculaDto } from './dto/create-curricula.dto';
import { UpdateCurriculaDto } from './dto/update-curricula.dto';
import { IAService } from '../ia/ia.service';
import { CursosService } from '../cursos/cursos.service';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class CurriculasService {
  constructor(
    @InjectRepository(Curricula)
    private readonly curriculaRepo: Repository<Curricula>,
    private readonly iaService: IAService,
    private readonly cursosService: CursosService,
  ) {}

  async create(createCurriculaDto: CreateCurriculaDto): Promise<Curricula> {
    const curricula = this.curriculaRepo.create(createCurriculaDto);
    return await this.curriculaRepo.save(curricula);
  }

  async findAll(carreraId?: number): Promise<Curricula[]> {
    const where: any = {};
    if (carreraId) where.carreraId = carreraId;
    const curriculas = await this.curriculaRepo.find({ 
      where, 
      relations: ['carrera', 'cursos'],
      order: { createdAt: 'DESC' }
    });
    // Calcular total de créditos para cada malla
    return curriculas.map(curricula => ({
      ...curricula,
      totalCreditos: curricula.cursos?.reduce((sum, curso) => sum + (curso.creditos || 0), 0) || 0
    } as any));
  }

  async findOne(id: number): Promise<Curricula> {
    const curricula = await this.curriculaRepo.findOne({ 
      where: { id },
      relations: ['carrera', 'cursos']
    });
    if (!curricula) {
      throw new NotFoundException(`Malla curricular con ID ${id} no encontrada`);
    }
    return curricula;
  }

  async update(id: number, updateCurriculaDto: UpdateCurriculaDto): Promise<Curricula> {
    const curricula = await this.findOne(id);
    Object.assign(curricula, updateCurriculaDto);
    return await this.curriculaRepo.save(curricula);
  }

  async remove(id: number): Promise<void> {
    const curricula = await this.findOne(id);
    await this.curriculaRepo.remove(curricula);
  }

  // Método para importar PDF y crear curricula + cursos
  async importCurriculaFromPDF(fileBuffer: Buffer, createCurriculaDto: CreateCurriculaDto): Promise<{ curricula: Curricula; cursos: any[] }> {
    // 1. Extraer texto del PDF
    const pdfText = await this.iaService.extractTextFromPdf(fileBuffer);
    
    // 2. Parsear cursos del texto
    const cursosExtraidos = await this.iaService.parseCursosFromText(pdfText);
    
    // 3. Crear la malla curricular
    const curricula = this.curriculaRepo.create(createCurriculaDto);
    await this.curriculaRepo.save(curricula);
    
    // 4. Guardar los cursos y asociarlos a la malla
    const savedCursos = await this.cursosService.confirmImportFromIA(createCurriculaDto.carreraId, cursosExtraidos, curricula.id);
    
    // 5. Recargar la malla con los cursos
    const curriculaConCursos = await this.findOne(curricula.id);
    
    return {
      curricula: curriculaConCursos,
      cursos: savedCursos.cursos
    };
  }

  // Método para previsualizar cursos desde PDF (sin guardar)
  async previewCursosFromPDF(id: number, file?: Express.Multer.File): Promise<any> {
    const curricula = await this.findOne(id);
    
    let fileBuffer: Buffer;
    
    // Si no hay archivo, usar el PDF guardado en la currícula
    if (!file && curricula.pdfArchivo) {
      const filePath = join(process.cwd(), 'uploads', curricula.pdfArchivo);
      if (!existsSync(filePath)) {
        throw new BadRequestException('El PDF guardado no existe');
      }
      fileBuffer = readFileSync(filePath);
    } else if (file) {
      // Si hay un archivo nuevo, usar ese
      fileBuffer = file.buffer;
    } else {
      throw new BadRequestException('Debes subir un PDF o tener un PDF guardado en la currícula');
    }
    
    const pdfText = await this.iaService.extractTextFromPdf(fileBuffer);
    
    const cursosExtraidos = await this.iaService.parseCursosFromText(pdfText);

    const cursos = cursosExtraidos
      .map((data: any) => this.cursosService.normalizeCursoData(data))
      .filter((data: any) => data.codigo || data.nombre);
    
    return {
      message: 'Previsualización generada correctamente.',
      count: cursos.length,
      carreraId: curricula.carreraId,
      curriculaId: curricula.id,
      cursos,
    };
  }

  // Método para confirmar y guardar cursos previsualizados
  async confirmImportCursosFromPreview(id: number, cursos: any[]): Promise<any> {
    const curricula = await this.findOne(id);
    const savedCursos = await this.cursosService.confirmImportFromIA(curricula.carreraId, cursos, curricula.id);
    const curriculaConCursos = await this.findOne(curricula.id);
    
    return {
      curricula: curriculaConCursos,
      cursos: savedCursos.cursos
    };
  }

}
