import { Entity, PrimaryGeneratedColumn, Column, OneToMany, UpdateDateColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Horario } from './horario.entity';
import { AsignacionDocenteCurso } from './asignacion-docente-curso.entity';
import { Usuario } from './usuario.entity';
import { DocenteCarrera } from './docente-carrera.entity';
import { VentanaAtencion } from './ventana-atencion.entity';
import { peruTimestampTransformer } from './peru-timestamp.transformer';

export enum TipoContrato {
  NOMBRADO = 'nombrado',
  CONTRATADO = 'contratado',
  EXTRAORDINARIO = 'extraordinario',
}

export enum Categoria {
  PRINCIPAL = 'principal',
  ASOCIADO = 'asociado',
  AUXILIAR = 'auxiliar',
  TIPO_A1 = 'tipo_a1',
  TIPO_A2 = 'tipo_a2',
  TIPO_A3 = 'tipo_a3',
  TIPO_B1 = 'tipo_b1',
  TIPO_B2 = 'tipo_b2',
  TIPO_B3 = 'tipo_b3',
  JEFE_PRACTICA = 'jefe_practica',
}

export enum Facultad {
  CIENCIAS_AGROPECUARIAS = 'ciencias_agropecuarias',
  CIENCIAS_BIOLOGICAS = 'ciencias_biologicas',
  CIENCIAS_ECONOMICAS = 'ciencias_economicas',
  CIENCIAS_FISICAS_Y_MATEMATICAS = 'ciencias_fisicas_y_matematicas',
  CIENCIAS_SOCIALES = 'ciencias_sociales',
  EDUCACION_Y_CIENCIAS_DE_LA_COMUNICACION = 'educacion_y_ciencias_de_la_comunicacion',
  DERECHO_Y_CIENCIAS_POLITICAS = 'derecho_y_ciencias_politicas',
  ENFERMERIA = 'enfermeria',
  ESTOMATOLOGIA = 'estomatologia',
  FARMACIA_Y_BIOQUIMICA = 'farmacia_y_bioquimica',
  INGENIERIA = 'ingenieria',
  INGENIERIA_QUIMICA = 'ingenieria_quimica',
  MEDICINA = 'medicina',
}

export enum DepartamentoAcademico {
  ADMINISTRACION = 'administracion',
  AGRONOMIA_Y_ZOOTECNIA = 'agronomia_y_zootecnia',
  ARQUEOLOGIA_Y_ANTROPOLOGIA = 'arqueologia_y_antropologia',
  BIOQUIMICA = 'bioquimica',
  CIENCIAS_AGROINDUSTRIALES = 'ciencias_agroindustriales',
  CIENCIAS_BASICAS_MEDICAS = 'ciencias_basicas_medicas',
  CIENCIAS_BIOLOGICAS = 'ciencias_biologicas',
  CIENCIAS_DE_LA_EDUCACION = 'ciencias_de_la_educacion',
  CIENCIAS_PSICOLOGICAS = 'ciencias_psicologicas',
  CIENCIAS_SOCIALES = 'ciencias_sociales',
  CIRUGIA = 'cirugia',
  COMUNICACION_SOCIAL = 'comunicacion_social',
  CONTABILIDAD_Y_FINANZAS = 'contabilidad_y_finanzas',
  ENFERMERIA_DE_LA_MUJER_NINO_Y_ADOLESCENTE = 'enfermeria_de_la_mujer_nino_y_adolescente',
  DERECHO = 'derecho',
  ECONOMIA = 'economia',
  ESTADISTICA = 'estadistica',
  ESTOMATOLOGIA = 'estomatologia',
  FARMACOLOGIA = 'farmacologia',
  FARMACOTECNIA = 'farmacotecnia',
  FILOSOFIA_Y_ARTE = 'filosofia_y_arte',
  FISICA = 'fisica',
  FISIOLOGIA_HUMANA = 'fisiologia_humana',
  GINECOLOGIA_Y_OBSTETRICIA = 'ginecologia_y_obstetricia',
  HISTORIA_Y_GEOGRAFIA = 'historia_y_geografia',
  IDIOMAS_Y_LINGUISTICA = 'idiomas_y_linguistica',
  INFORMATICA = 'informatica',
  INGENIERIA_AMBIENTAL = 'ingenieria_ambiental',
  INGENIERIA_CIVIL_ARQUITECTURA_Y_URBANISMO = 'ingenieria_civil_arquitectura_y_urbanismo',
  INGENIERIA_DE_MATERIALES = 'ingenieria_de_materiales',
  INGENIERIA_DE_MINAS = 'ingenieria_de_minas',
  INGENIERIA_DE_SISTEMAS = 'ingenieria_de_sistemas',
  INGENIERIA_INDUSTRIAL = 'ingenieria_industrial',
  INGENIERIA_MECATRONICA = 'ingenieria_mecatronica',
  INGENIERIA_METALURGICA = 'ingenieria_metalurgica',
  INGENIERIA_QUIMICA = 'ingenieria_quimica',
  LENGUA_NACIONAL_Y_LITERATURA = 'lengua_nacional_y_literatura',
  MATEMATICAS = 'matematicas',
  MECANICA_Y_ENERGIA = 'mecanica_y_energia',
  MEDICINA = 'medicina',
  MEDICINA_PREVENTIVA_Y_SALUD_PUBLICA = 'medicina_preventiva_y_salud_publica',
  MICROBIOLOGIA_Y_PARASITOLOGIA = 'microbiologia_y_parasitologia',
  MORFOLOGIA_HUMANA = 'morfologia_humana',
  PEDIATRIA = 'pediatria',
  PESQUERIA = 'pesqueria',
  QUIMICA = 'quimica',
  QUIMICA_BIOLOGICA_Y_FISIOLOGIA_ANIMAL = 'quimica_biologica_y_fisiologia_animal',
  SALUD_DEL_ADULTO_Y_SALUD_FAMILIAR_Y_COMUNITARIA = 'salud_del_adulto_y_salud_familiar_y_comunitaria',
}

export enum TipoInvestigacion {
  NINGUNA = 'NINGUNA',
  INVESTIGADOR = 'INVESTIGADOR',
  RENACYT = 'RENACYT',
}

export enum EstadoSeleccion {
  EN_ESPERA = 'en_espera',
  EN_ATENCION = 'en_atencion',
  FINALIZADO = 'finalizado',
}

@Entity('docentes')
@Index('idx_docentes_jerarquia', ['condicion', 'categoria', 'antiguedadAnios'])
@Index('idx_docentes_activos', ['activo'])
export class Docente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  nombreCompleto: string;

  @Column({ type: 'varchar', length: 8, unique: true, nullable: true, name: 'numeroDocumento' })
  dni: string;

  @Column({ type: 'enum', enum: TipoContrato, nullable: true, default: TipoContrato.NOMBRADO })
  condicion: TipoContrato;

  @Column({ type: 'enum', enum: Categoria, nullable: true, default: Categoria.ASOCIADO })
  categoria: Categoria;

  @Column({ type: 'integer', default: 0 })
  antiguedadAnios: number;

  @Column({ type: 'date', nullable: true })
  fechaIngreso: Date;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'enum', enum: EstadoSeleccion, default: EstadoSeleccion.EN_ESPERA })
  estadoSeleccion: EstadoSeleccion;

  @Column({ type: 'timestamp', nullable: true, transformer: peruTimestampTransformer })
  inicioAtencion: Date;

  @Column({ type: 'timestamp', nullable: true, transformer: peruTimestampTransformer })
  finAtencion: Date;

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegramId: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  emailPersonal: string;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'TIEMPO COMPLETO' })
  dedicacion: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: '0000', name: 'codigo_ibm' })
  codigoIBM: string;

  @Column({ type: 'text', nullable: true, name: 'firma_base64' })
  firmaBase64: string;

  @Column({ type: 'enum', enum: Facultad, nullable: true })
  facultad: Facultad;

  @Column({ type: 'enum', enum: DepartamentoAcademico, nullable: true })
  departamentoAcademico: DepartamentoAcademico;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cargoGobierno: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cargoGestionInstitucional: string;

  @Column({ type: 'boolean', default: false })
  esBecario: boolean;

  @Column({ type: 'enum', enum: TipoInvestigacion, default: TipoInvestigacion.NINGUNA })
  investigacion: TipoInvestigacion;

  @Column({ type: 'simple-json', default: ['Ninguno'] })
  dependencias: string[];

  @Column({ name: 'ventana_id', type: 'integer', nullable: true })
  ventanaId: number | null;

  @ManyToOne(() => VentanaAtencion)
  @JoinColumn({ name: 'ventana_id' })
  ventana: VentanaAtencion;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AsignacionDocenteCurso, (asignacion) => asignacion.docente, { cascade: true })
  asignaciones: AsignacionDocenteCurso[];

  @OneToMany(() => Horario, (horario) => horario.docente, { cascade: true })
  horarios: Horario[];

  @OneToMany(() => Usuario, (usuario) => usuario.docente)
  usuarios: Usuario[];

  @OneToMany(() => DocenteCarrera, (dc) => dc.docente, { cascade: true })
  carreras: DocenteCarrera[];
}