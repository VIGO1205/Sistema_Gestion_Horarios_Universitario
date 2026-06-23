import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

    // Normalizar y filtrar cursos que no tengan ni código ni nombre (completamente inválidos)
    const normalizedCursos = cursos
      .map((curso) => this.normalizeCursoData(curso))
      .filter((data) => data.nombre);

    if (normalizedCursos.length === 0) {
      throw new BadRequestException('No se pudieron extraer cursos válidos del PDF.');
    }

    const savedCursos: Curso[] = [];
    let tmpCounter = 1;

    for (const data of normalizedCursos) {
      // Generar código único si la IA no pudo extraerlo
      if (!data.codigo) {
        data.codigo = `TMP${String(tmpCounter++).padStart(4, '0')}`;
      }

      // Normalizar créditos: si son inválidos, usar 0 (editable después)
      if (!Number.isFinite(data.creditos) || data.creditos < 0) {
        data.creditos = 0;
      }

      // Verificar si el curso ya existe (por código + curriculaId si aplica)
      const whereClause: any = { codigo: data.codigo };
      if (curriculaId) {
        whereClause.curriculaId = curriculaId;
      }
      const existing = await this.cursosRepository.findOne({ where: whereClause });
      if (existing) {
        // Actualizar si ya existe en esta malla
        Object.assign(existing, { ...data, carreraId, curriculaId });
        const saved = await this.cursosRepository.save(existing);
        savedCursos.push(saved);
      } else {
        // Crear uno nuevo (aunque exista el mismo código en otra malla)
        const curso = this.cursosRepository.create({ ...data, carreraId, curriculaId } as Partial<Curso>);
        const saved = await this.cursosRepository.save(curso);
        savedCursos.push(saved);
      }
    }

    return {
      message: `Se han guardado ${savedCursos.length} cursos.`,
      count: savedCursos.length,
      cursos: savedCursos,
    };
  }

  public normalizeCursoData(data: any) {
    const tipoCurso = data?.tipoCurso;
    const validTipoCurso = ['ES', 'EL', 'OB', 'OP'].includes(tipoCurso) ? tipoCurso : null;
    const creditos = Number(data?.creditos);

    return {
      codigo: String(data?.codigo ?? '').trim(),
      nombre: String(data?.nombre ?? '').trim(),
      cicloAcademico: String(data?.cicloAcademico ?? '').trim(),
      creditos: Number.isFinite(creditos) ? creditos : NaN,
      departamento: String(data?.departamento ?? 'General').trim(),
      tipoCurso: validTipoCurso,
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

  async batchAssignCurricula(ids: number[], curriculaId: number): Promise<{ count: number }> {
    const result = await this.cursosRepository.update(
      { id: In(ids) },
      { curriculaId },
    );
    return { count: result.affected || 0 };
  }
}
