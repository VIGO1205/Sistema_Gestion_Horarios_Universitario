import { useState, useRef, useEffect } from 'react';

interface UseDragSelectionProps {
  configGrilla: any;
  onSelectionComplete: (selection: any) => void;
  tableContainerRef: React.RefObject<HTMLDivElement>;
}

export const useDragSelection = ({
  configGrilla,
  onSelectionComplete,
  tableContainerRef
}: UseDragSelectionProps) => {
  const [dragSelection, setDragSelection] = useState<any>(null);
  const dragSelectionRef = useRef<any>(null);

  useEffect(() => {
    const updateDragSelectionFromPointer = (clientY: number) => {
      const selection = dragSelectionRef.current;
      if (!selection || !tableContainerRef.current) return;
      
      const startHour = parseInt(configGrilla.horaInicio.split(':')[0]);
      const endHour = parseInt(configGrilla.horaFin.split(':')[0]);
      const numSlots = endHour - startHour;

      const rect = tableContainerRef.current.getBoundingClientRect();
      const scrollOffset = tableContainerRef.current.scrollTop;
      
      // relativeY es la posición del mouse dentro del contenedor scrolleable
      const relativeY = clientY - rect.top + scrollOffset;

      // Restamos el spacer inicial (40px) y el header de la tabla (80px)
      // Estos valores vienen de HORA_SPACER_HEIGHT y el alto del TableHead en GrillaHorario
      const gridTopOffset = 40 + 80; 
      
      const effectiveY = relativeY - gridTopOffset;
      
      // 80px es HORA_ALTURA_FILA definido en constantes.ts
      const slotIndex = Math.max(0, Math.min(numSlots - 1, Math.floor(effectiveY / 80))); 
      
      const nextSelection = { ...selection, endIndex: slotIndex };
      dragSelectionRef.current = nextSelection;
      setDragSelection(nextSelection);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (dragSelectionRef.current) {
        updateDragSelectionFromPointer(event.clientY);
      }
    };

    const handleMouseUp = () => {
      const selection = dragSelectionRef.current;
      if (selection) {
        onSelectionComplete(selection);
        dragSelectionRef.current = null;
        setDragSelection(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [configGrilla, onSelectionComplete, tableContainerRef]);

  const startDrag = (day: number, slotIndex: number, mode: 'create' | 'edit' = 'create', event?: any) => {
    const newSelection = { day, startIndex: slotIndex, endIndex: slotIndex, mode, event };
    dragSelectionRef.current = newSelection;
    setDragSelection(newSelection);
  };

  return {
    dragSelection,
    startDrag
  };
};
