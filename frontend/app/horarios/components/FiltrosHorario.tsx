import React from 'react';
import { 
  Grid, Paper, FormControl, InputLabel, Select, MenuItem, 
  InputAdornment, Autocomplete, TextField, Button 
} from '@mui/material';
import { 
  CalendarMonth as CalendarIcon, 
  FilterList as FilterIcon, 
  School as SchoolIcon, 
  Person as PersonIcon, 
  DeleteSweep as DeleteSweepIcon, 
  Tune as TuneIcon, 
  Room as RoomIcon 
} from '@mui/icons-material';

interface FiltrosHorarioProps {
  filtros: any;
  setFiltros: (filtros: any) => void;
  ciclos: any[];
  carreras: any[];
  docentesFiltrados: any[];
  aulasFiltradas: any[];
  esDocente: boolean;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  onLimpiar: () => void;
  tiposCarga: string[];
  tiposAula: any[];
}

const FiltrosHorario: React.FC<FiltrosHorarioProps> = ({
  filtros,
  setFiltros,
  ciclos,
  carreras,
  docentesFiltrados,
  aulasFiltradas,
  esDocente,
  showAdvancedFilters,
  setShowAdvancedFilters,
  onLimpiar,
  tiposCarga,
  tiposAula
}) => {
  return (
    <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <Grid container spacing={2} alignItems="center">
        {/* Fila 1: Filtros Principales */}
        <Grid item xs={12} md={esDocente ? 2 : 1.5}>
          <FormControl fullWidth size="small">
            <InputLabel>Periodo Académico</InputLabel>
            <Select
              value={filtros.ciclo}
              label="Periodo Académico"
              onChange={(e) => setFiltros({ ...filtros, ciclo: e.target.value })}
              startAdornment={<InputAdornment position="start"><CalendarIcon fontSize="small" color="primary" /></InputAdornment>}
            >
              {ciclos.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nombre} {c.esActual ? '(Actual)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={esDocente ? 2 : 1.5}>
          <FormControl fullWidth size="small">
            <InputLabel>Ciclo</InputLabel>
            <Select
              value={filtros.cicloEstudio}
               label="Ciclo"
               onChange={(e) => setFiltros({ ...filtros, cicloEstudio: e.target.value })}
               startAdornment={<InputAdornment position="start"><FilterIcon fontSize="small" color="primary" /></InputAdornment>}
             >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                <MenuItem key={c} value={String(c)}>
                  {c}° CICLO
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={esDocente ? 6 : 2}>
          <FormControl fullWidth size="small">
            <InputLabel>Carrera</InputLabel>
            <Select
              value={filtros.carrera?.id || ''}
              label="Carrera"
              onChange={(e) => {
                const carrera = carreras.find(c => c.id === e.target.value);
                setFiltros({ ...filtros, carrera: carrera || null });
              }}
              startAdornment={<InputAdornment position="start"><SchoolIcon fontSize="small" color="primary" /></InputAdornment>}
            >
              {carreras.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {!esDocente && (
          <Grid item xs={12} md={5}>
            <Autocomplete
              size="small"
              options={docentesFiltrados}
              getOptionLabel={(option) => option.nombreCompleto || option.nombre || ''}
              filterOptions={(options, state) => {
                const displayOptions = options.filter((option: any) =>
                  (option.nombreCompleto || '').toLowerCase().includes(state.inputValue.toLowerCase())
                );
                return displayOptions.slice(0, 15);
              }}
              value={filtros.docente}
              onChange={(_, newValue) => setFiltros({ ...filtros, docente: newValue })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar Docente por Nombre"
                  placeholder="Escribe el nombre del docente..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" color="primary" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
        )}

        <Grid item xs={12} md={2}>
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<DeleteSweepIcon />}
            onClick={onLimpiar}
            sx={{ 
              borderRadius: 2, 
              fontWeight: 800, 
              color: '#666', 
              borderColor: '#ddd', 
              minWidth: 0, 
              whiteSpace: 'nowrap',
              borderWidth: 1.5,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              height: 40
            }}
          >
            Limpiar
          </Button>
        </Grid>

        {/* Fila 2: Botón Filtros y Filtros Avanzados */}
        <Grid item xs={12} md={2}>
          <Button 
            fullWidth
            variant={showAdvancedFilters ? "contained" : "outlined"}
            startIcon={<TuneIcon />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            sx={{ 
              borderRadius: 2, 
              fontWeight: 800,
              bgcolor: showAdvancedFilters ? '#003366' : 'transparent',
              color: showAdvancedFilters ? 'white' : '#003366',
              borderColor: '#003366',
              borderWidth: 1.5,
              minWidth: 0,
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              height: 40,
              '&:hover': {
                bgcolor: showAdvancedFilters ? '#002244' : 'rgba(0, 51, 102, 0.04)',
                borderColor: '#003366',
                borderWidth: 1.5
              }
            }}
          >
            Filtros
          </Button>
        </Grid>

        {showAdvancedFilters && (
          <Grid item xs={12} md={10}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Carga</InputLabel>
                  <Select
                    value={filtros.tipoCarga}
                    label="Tipo de Carga"
                    onChange={(e) => {
                      setFiltros({ ...filtros, tipoCarga: e.target.value });
                    }}
                  >
                    {tiposCarga.map(tipo => (
                      <MenuItem key={tipo} value={tipo}>{tipo === 'LECTIVA' ? 'Carga Lectiva' : 'Carga No Lectiva'}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Aula</InputLabel>
                  <Select
                    value={filtros.tipoAula}
                    label="Tipo de Aula"
                    onChange={(e) => setFiltros({ ...filtros, tipoAula: e.target.value, aula: 'todos' })}
                  >
                    <MenuItem value="todos">Todos los Tipos</MenuItem>
                    {tiposAula.map(t => (
                      <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Aula / Ambiente</InputLabel>
                  <Select
                    value={filtros.aula}
                    label="Aula / Ambiente"
                    onChange={(e) => setFiltros({ ...filtros, aula: e.target.value })}
                    startAdornment={<InputAdornment position="start"><RoomIcon fontSize="small" color="primary" /></InputAdornment>}
                  >
                    <MenuItem value="todos">Todas las Aulas</MenuItem>
                    {aulasFiltradas.map((a: any) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default FiltrosHorario;
