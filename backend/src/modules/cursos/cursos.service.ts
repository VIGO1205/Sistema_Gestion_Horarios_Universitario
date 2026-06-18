import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curso } from '../../entities/curso.entity';
import { CreateCursoDto } from './dto/create-curso.dto';
import { UpdateCursoDto } from './dto/update-curso.dto';
import { IAService } from '../ia/ia.service';

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private cursosRepository: Repository<Curso>,
    private iaService: IAService,
  ) {}

  async create(createCursoDto: CreateCursoDto): Promise<Curso> {
    const curso = this.cursosRepository.create(createCursoDto as unknown as Partial<Curso>);
    return await this.cursosRepository.save(curso);
  }

  async importFromIAPreview(file: Express.Multer.File, carreraId: number): Promise<any> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo PDF.');
    }

    if (!carreraId || Number.isNaN(carreraId)) {
      throw new BadRequestException('Debes seleccionar una carrera válida.');
    }

    const text = await this.iaService.extractTextFromPdf(file.buffer);
    const cursosData = await this.iaService.parseCursosFromText(text);

    const cursos = cursosData
      .map((data: any) => this.normalizeCursoData(data))
      .filter((data: any) => data.codigo || data.nombre);

    return {
      message: 'Previsualización generada correctamente.',
      count: cursos.length,
      carreraId,
      cursos,
    };
  }

  async confirmImportFromIA(carreraId: number, cursos: any[], curriculaId?: number): Promise<any> {
    if (!carreraId || Number.isNaN(carreraId)) {
      throw new BadRequestException('Debes seleccionar una carrera válida.');
    }

    if (!Array.isArray(cursos) || cursos.length === 0) {
      throw new BadRequestException('No hay cursos para guardar.');
    }

    const invalidRows: number[] = [];
    const normalizedCursos = cursos.map((curso, index) => {
      const normalized = this.normalizeCursoData(curso);

      const isInvalid =
        !normalized.codigo ||
        !normalized.nombre ||
        !normalized.cicloAcademico ||
        !normalized.departamento ||
        !Number.isFinite(normalized.creditos) ||
        normalized.creditos < 1;

      if (isInvalid) {
        invalidRows.push(index + 1);
      }

      return normalized;
    });

    if (invalidRows.length > 0) {
      throw new BadRequestException(
        `Hay filas inválidas en la previsualización (${invalidRows.join(', ')}). Revisa código, nombre, ciclo y créditos (mínimo 1).`,
      );
    }

    const savedCursos: Curso[] = [];
    for (const data of normalizedCursos) {
      // Verificar si el curso ya existe por código
      const existing = await this.cursosRepository.findOne({ where: { codigo: data.codigo } });
      if (existing) {
        // Actualizar si ya existe
        Object.assign(existing, { ...data, carreraId, curriculaId });
        const saved = await this.cursosRepository.save(existing);
        savedCursos.push(saved as any);
      } else {
        // Crear si no existe
        const curso = this.cursosRepository.create({ ...data, carreraId, curriculaId } as Partial<Curso>);
        const saved = await this.cursosRepository.save(curso);
        savedCursos.push(saved as any);
      }
    }

    return {
      message: `Se han guardado ${savedCursos.length} cursos.`,
      count: savedCursos.length,
      cursos: savedCursos,
    };
  }

  private normalizeCursoData(data: any) {
    const creditos = Number(data?.creditos);

    return {
      codigo: String(data?.codigo ?? '').trim(),
      nombre: String(data?.nombre ?? '').trim(),
      cicloAcademico: String(data?.cicloAcademico ?? '').trim(),
      creditos: Number.isFinite(creditos) ? creditos : NaN,
      departamento: String(data?.departamento ?? 'General').trim(),
    };
  }

  async findAll(carreraId?: number, cicloAcademico?: string, departamento?: string, curriculaId?: number): Promise<Curso[]> {
    const where: any = {};
    if (carreraId) where.carreraId = carreraId;
    if (cicloAcademico) where.cicloAcademico = cicloAcademico;
    if (departamento && departamento !== 'todos') where.departamento = departamento;
    if (curriculaId) where.curriculaId = curriculaId;

    return await this.cursosRepository.find({
      where,
      relations: ['carrera', 'curricula'],
      order: { codigo: 'ASC' },
    });
  }

  async findUniqueDepartamentos(): Promise<string[]> {
    const cursos = await this.cursosRepository
      .createQueryBuilder('curso')
      .select('DISTINCT curso.departamento', 'departamento')
      .orderBy('curso.departamento', 'ASC')
      .limit(10)
      .getRawMany();
    
    return cursos.map(c => c.departamento);
  }

  async findByCiclo(cicloAcademico: string): Promise<Curso[]> {
    return this.findAll(undefined, cicloAcademico);
  }

  async findOne(id: number): Promise<Curso> {
    const curso = await this.cursosRepository.findOne({ where: { id } });
    if (!curso) {
      throw new NotFoundException(`Curso con id ${id} no encontrado`);
    }
    return curso;
  }

  async update(id: number, updateCursoDto: UpdateCursoDto): Promise<Curso> {
    const curso = await this.findOne(id);
    Object.assign(curso, updateCursoDto);
    return await this.cursosRepository.save(curso);
  }

  async remove(id: number): Promise<void> {
    const curso = await this.findOne(id);
    await this.cursosRepository.remove(curso);
  }

  async findSinMalla(carreraId?: number): Promise<Curso[]> {
    const where: any = { curriculaId: null };
    if (carreraId) where.carreraId = carreraId;
    return await this.cursosRepository.find({ where });
  }
}
