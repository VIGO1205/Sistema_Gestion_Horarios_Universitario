'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Divider,
  CircularProgress,
  Paper,
  Container,
} from '@mui/material';
import {
  AutoAwesome as AutoIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import api from '@/lib/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function AsignacionAutomaticaPage() {
  const [loading, setLoading] = useState(false);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [cicloSeleccionado, setCicloSeleccionado] = useState<number | ''>('');

  useEffect(() => {
    const cargarCiclos = async () => {
      try {
        const res = await api.get('/ciclos');
        setCiclos(res.data);
        const actual = res.data.find((c: any) => c.esActual);
        if (actual) setCicloSeleccionado(actual.id);
      } catch (error) {
        console.error('Error cargando ciclos:', error);
      }
    };
    cargarCiclos();
  }, []);

  const handleGenerarHorarios = async () => {
    if (!cicloSeleccionado) {
      MySwal.fire('Error', 'Debe seleccionar un ciclo académico', 'error');
      return;
    }

    const result = await MySwal.fire({
      title: '¿Generar Horarios Automáticamente?',
      text: "Este proceso asignará los cursos a los docentes basándose en su jerarquía y disponibilidad. Los horarios actuales para este ciclo podrían verse afectados.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const response = await api.post('/horarios/generar', null, {
          params: { cicloId: cicloSeleccionado }
        });
        
        const { exitosos, conflictos } = response.data;

        await MySwal.fire({
          title: 'Generación Completada',
          html: `Se han generado <b>${exitosos}</b> horarios con éxito.<br>${conflictos?.length > 0 ? `Se detectaron ${conflictos.length} conflictos que requieren atención manual.` : ''}`,
          icon: conflictos?.length > 0 ? 'warning' : 'success',
          confirmButtonColor: '#003366',
        });
      } catch (error: any) {
        MySwal.fire('Error', error.response?.data?.message || 'Error al generar horarios', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <AutoIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" fontWeight="700" color="#003366">
            Asignación Automática
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Motor de inteligencia para la programación académica basada en jerarquía docente.
          </Typography>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom fontWeight="600">
                Instrucciones
              </Typography>
              <Typography variant="body2" paragraph color="text.secondary">
                1. El sistema prioriza a los docentes por <b>Categoría</b> (Principal, Asociado, Auxiliar).
              </Typography>
              <Typography variant="body2" paragraph color="text.secondary">
                2. Dentro de cada categoría, se respeta la <b>Antigüedad</b> en años.
              </Typography>
              <Typography variant="body2" paragraph color="text.secondary">
                3. Se asignan primero los cursos de <b>Teoría</b> en aulas y luego <b>Laboratorios</b>.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                4. Podrá realizar ajustes finos manualmente en la pestaña de <b>Horarios</b> después de la generación.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <Paper variant="outlined" sx={{ p: 3, width: '100%', textAlign: 'center', bgcolor: '#f8f9fa' }}>
                <CalendarIcon sx={{ fontSize: 48, color: '#003366', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight="600">
                  Ciclo Académico Actual
                </Typography>
                <Typography variant="h5" color="primary" fontWeight="700">
                  {ciclos.find(c => c.id === cicloSeleccionado)?.nombre || 'Cargando...'}
                </Typography>
              </Paper>

              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                onClick={handleGenerarHorarios}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoIcon />}
                sx={{ 
                  py: 2, 
                  borderRadius: 2, 
                  fontSize: '1.1rem',
                  textTransform: 'none',
                  bgcolor: '#003366',
                  '&:hover': { bgcolor: '#002244' }
                }}
              >
                {loading ? 'Generando Horarios...' : 'Iniciar Generación Automática'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}
