'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HorusAvatar from './HorusAvatar';
import type { HorusDisplayMode, Message } from './HorusChatContext';
import { useHorusChat } from './HorusChatContext';
import api from '@/lib/api';
import { useAuth } from '../providers/AuthProvider';

const SUGGESTED_PROMPTS = [
  'Disponibilidad del lunes',
  'Aulas de laboratorio libres',
  'Dime mis horarios',
];

interface HorusChatPanelProps {
  variant: HorusDisplayMode;
  onDetach?: () => void;
  onDock?: () => void;
  canDock?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
  compact?: boolean;
  showDockButton?: boolean;
  onHeaderMouseDown?: (e: React.MouseEvent) => void;
  isDragging?: boolean;
  isMini?: boolean;
  isSidebarExpanded?: boolean;
  onToggleSidebarExpand?: () => void;
}

export default function HorusChatPanel({
  variant,
  onDetach,
  onDock,
  canDock,
  onMinimize,
  onClose,
  compact = false,
  showDockButton = true,
  onHeaderMouseDown,
  isDragging = false,
  isMini = false,
  isSidebarExpanded = false,
  onToggleSidebarExpand,
}: HorusChatPanelProps) {
  const { usuario } = useAuth();
  const { messages, setMessages, startNewConversation } = useHorusChat();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCancellingListening, setIsCancellingListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSidebar = variant === 'sidebar';
  
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-PE';

        recognition.onstart = () => {
          setIsListening(true);
          setIsCancellingListening(false);
          setVoiceTranscript('');
          if (recognitionRef.current) {
            recognitionRef.current.fullTranscript = '';
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Solo agregamos texto si no fue una cancelación manual
          if (!isCancellingListening) {
            const finalText = recognitionRef.current?.fullTranscript || '';
            if (finalText.trim()) {
              setInput((prev) => {
                const cleanPrev = prev.trim();
                const space = cleanPrev ? ' ' : '';
                return cleanPrev + space + finalText.trim();
              });
            }
          } else {
            // Si fue cancelación manual, limpiamos el transcript y reseteamos
            if (recognitionRef.current) {
              recognitionRef.current.fullTranscript = '';
            }
          }
          
          setIsCancellingListening(false);
          setVoiceTranscript('');
        };

        recognition.onresult = (event: any) => {
          // Resetear el temporizador de silencio cada vez que hay un resultado
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          silenceTimerRef.current = setTimeout(() => {
            recognition.stop();
          }, 2500); // 2.5 segundos de silencio antes de detener

          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Actualizamos el transcript acumulado en la referencia
          if (finalTranscript) {
            recognitionRef.current.fullTranscript = (recognitionRef.current.fullTranscript || '') + finalTranscript;
          }

          // Para la visualización (aunque esté oculta, sirve para la lógica)
          setVoiceTranscript(finalTranscript || interimTranscript);
        };
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isCancellingListening]);

  const toggleListening = () => {
    if (isListening) {
      // Cancelar manualmente: no queremos agregar texto al input
      setIsCancellingListening(true);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      // Limpiar el transcript inmediatamente
      if (recognitionRef.current) {
        recognitionRef.current.fullTranscript = '';
      }
      setVoiceTranscript('');
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const response = await api.post('/ia/chat', {
        message: userMsg.text,
        history,
        context: {
          userEmail: usuario?.email,
          docenteId: usuario?.docenteId,
          rol: usuario?.rol,
        }
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.data.content,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error al consultar a HORUS:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        bgcolor: isListening 
          ? '#001a35' 
          : (isSidebar ? 'rgba(0, 20, 50, 0.55)' : '#ffffff'),
        borderRadius: isSidebar ? 3 : 3,
        border: isSidebar ? '1px solid rgba(255, 215, 0, 0.2)' : '2px solid rgba(147, 197, 253, 0.7)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Overlay de Voz Inmersivo */}
      {isListening && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0, 26, 53, 0.95)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.3s ease',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: '#fff',
              fontWeight: 700,
              mb: 4,
              letterSpacing: 1,
              opacity: 0.8,
            }}
          >
            HORUS TE ESCUCHA
          </Typography>

          {/* Círculo Animado (Tipo Spruce/Siri) */}
          <Box
            sx={{
              position: 'relative',
              width: 140,
              height: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Capas de ondas */}
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '2px solid #3b82f6',
                  opacity: 0,
                  animation: `ripple ${2 + i * 0.5}s infinite`,
                  '@keyframes ripple': {
                    '0%': { transform: 'scale(0.8)', opacity: 0 },
                    '50%': { opacity: 0.5 },
                    '100%': { transform: 'scale(1.5)', opacity: 0 },
                  },
                }}
              />
            ))}
            
            {/* Círculo Central Brillante */}
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)',
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)',
                animation: 'pulseGlow 2s infinite ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                '@keyframes pulseGlow': {
                  '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
                  '50%': { transform: 'scale(1.08)', boxShadow: '0 0 60px rgba(59, 130, 246, 0.8)' },
                },
              }}
            >
              <MicIcon sx={{ fontSize: 40, color: '#fff' }} />
            </Box>
          </Box>

          <IconButton
            onClick={toggleListening}
            sx={{
              mt: 6,
              bgcolor: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.3)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      {/* Círculo del Avatar (Anclaje fijo) */}
      {!isSidebar && (
        <Box
          sx={{
            position: 'absolute',
            left: 14,
            top: 14,
            width: 42,
            height: 42,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <HorusAvatar size={42} showPulse={isMini} />
        </Box>
      )}

      {/* Cabecera */}
      <Box
        onMouseDown={onHeaderMouseDown}
        sx={{
          px: 1.5,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: isSidebar
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid #93c5fd',
          bgcolor: isSidebar ? 'rgba(0, 34, 68, 0.9)' : 'rgba(0, 34, 68, 0.95)',
          flexShrink: 0,
          cursor: onHeaderMouseDown ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none',
          touchAction: 'none',
          opacity: isMini && !isSidebar ? 0 : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {isSidebar && <HorusAvatar size={compact ? 32 : 36} />}
        
        {/* Espaciador para cuando el avatar es absoluto */}
        {!isSidebar && <Box sx={{ width: 42, height: 42, mr: 1 }} />}

        <Box 
          sx={{ 
            flex: 1, 
            minWidth: 0, 
            opacity: isMini ? 0 : 1, 
            transition: 'opacity 0.2s', 
            cursor: isSidebar ? 'pointer' : 'default' 
          }} 
          onClick={isSidebar ? onToggleSidebarExpand : undefined}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                color: '#FFD700',
                letterSpacing: 0.5,
                lineHeight: 1.2,
              }}
            >
              HORUS
            </Typography>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: '#10b981',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
              }}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.75)',
              fontSize: '0.68rem',
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isSidebar && !isSidebarExpanded ? 'Click para expandir chat' : 'Asistente de horarios UNT'}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            alignSelf: 'center',
            gap: 0.5,
            flexShrink: 0,
            height: 36,
            opacity: isSidebar && !isSidebarExpanded ? 0.5 : 1,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Botón de Nueva Conversación */}
          <Tooltip title="Nueva conversación" placement="top">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                startNewConversation();
              }}
              sx={{
                width: 32,
                height: 32,
                color: 'rgba(255,255,255,0.8)',
                '&:hover': {
                  color: '#FFD700',
                  bgcolor: 'rgba(255,215,0,0.1)',
                },
              }}
            >
              <RestartAltIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          
          {!isSidebar && onMinimize && (
            <Tooltip title="Minimizar a ícono flotante" placement="top">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMinimize) onMinimize();
                }}
                sx={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0,
                  color: 'rgba(255,255,255,0.8)',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '&:hover': { color: '#FFD700', bgcolor: 'rgba(255,215,0,0.15)' },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    width: 14,
                    height: 2,
                    borderRadius: 1,
                    bgcolor: 'currentColor',
                  }}
                />
              </IconButton>
            </Tooltip>
          )}
          
          {isSidebar && onDetach && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip title="Abrir como ventana flotante" placement="top">
                <IconButton
                  size="small"
                  onClick={onDetach}
                  sx={{
                    width: 32,
                    height: 32,
                    color: 'rgba(255,255,255,0.7)',
                    '&:hover': { color: '#FFD700', bgcolor: 'rgba(255,215,0,0.1)' },
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          
          {!isSidebar && isLargeScreen && canDock && onDock && (
            <Tooltip title="Anclar al menú lateral" placement="top">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDock) onDock();
                }}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#dc2626',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#b91c1c' },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Mensajes */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: isSidebar ? 1 : 1.5,
          py: 1.5,
          display: isSidebar && !isSidebarExpanded ? 'none' : 'flex',
          flexDirection: 'column',
          gap: 1.25,
          minHeight: 0,
          opacity: isMini && !isSidebar ? 0 : 1,
          transition: 'opacity 0.2s ease',
          pointerEvents: isMini && !isSidebar ? 'none' : 'auto',
          '&::-webkit-scrollbar': { width: 6, height: 6 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: isSidebar ? 'rgba(255,215,0,0.35)' : 'rgba(100,116,139,0.4)',
            borderRadius: 6,
            border: '1px solid transparent',
            backgroundClip: 'padding-box',
            '&:hover': {
              bgcolor: isSidebar ? 'rgba(255,215,0,0.5)' : 'rgba(100,116,139,0.6)',
            },
          },
        }}
      >
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '90%',
              px: 1.5,
              py: 1,
              borderRadius: 2.5,
              borderTopLeftRadius: msg.role === 'assistant' ? 4 : 2.5,
              borderTopRightRadius: msg.role === 'user' ? 4 : 2.5,
              bgcolor: msg.role === 'user' 
                ? (isSidebar ? '#FFD700' : '#003366')
                : (isSidebar ? 'rgba(255, 255, 255, 0.1)' : '#f1f5f9'),
              color: msg.role === 'user'
                ? (isSidebar ? '#000' : '#fff')
                : (isSidebar ? 'rgba(255,255,255,0.92)' : '#334155'),
              border: isSidebar ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
              boxShadow: msg.role === 'user' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.8rem',
                lineHeight: 1.45,
                fontWeight: 400,
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              {msg.text}
            </Typography>
          </Box>
        ))}

        {isLoading && (
          <Box sx={{ alignSelf: 'flex-start', display: 'flex', gap: 1, alignItems: 'center', ml: 1 }}>
            <CircularProgress size={12} sx={{ color: isSidebar ? '#FFD700' : '#003366' }} />
            <Typography variant="caption" sx={{ color: isSidebar ? 'rgba(255,255,255,0.5)' : '#64748b', fontStyle: 'italic' }}>
              HORUS está pensando...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />

        {!isLoading && messages.length < 3 && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.5 }}>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <Chip
                key={prompt}
                label={prompt}
                size="small"
                onClick={() => setInput(prompt)}
                sx={{
                  height: 26,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  bgcolor: isSidebar ? 'rgba(255, 215, 0, 0.12)' : 'rgba(0, 51, 102, 0.06)',
                  color: isSidebar ? '#fde68a' : '#003366',
                  border: isSidebar ? '1px solid rgba(255,215,0,0.25)' : '1px solid rgba(0,51,102,0.12)',
                  '&:hover': {
                    bgcolor: isSidebar ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 51, 102, 0.1)',
                  },
                }}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Input */}
      <Box
        sx={{
          p: isSidebar ? 1 : 1.5,
          borderTop: isSidebar
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid #3b82f6',
          bgcolor: isSidebar ? 'rgba(0, 34, 68, 0.6)' : '#ffffff',
          flexShrink: 0,
          display: isSidebar && !isSidebarExpanded ? 'none' : 'block',
          opacity: isMini && !isSidebar ? 0 : 1,
          transition: 'opacity 0.2s ease',
          pointerEvents: isMini && !isSidebar ? 'none' : 'auto',
        }}
      >
        <TextField
            fullWidth
            size="small"
            multiline
            maxRows={5}
            placeholder="Escribe tu consulta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            InputProps={{
              sx: {
                fontSize: isSidebar ? '0.75rem' : '0.82rem',
                fontWeight: 400,
                borderRadius: 2.5,
                minHeight: isSidebar ? 36 : 44,
                py: 0.75,
                px: 1.25,
                alignItems: 'center',
                display: 'flex',
                bgcolor: isSidebar ? 'rgba(255,255,255,0.08)' : '#f8fafc',
                color: isSidebar ? '#fff' : '#0f172a',
                '& fieldset': {
                  borderColor: isSidebar ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
                },
                '&:hover fieldset': {
                  borderColor: isSidebar ? 'rgba(255,215,0,0.4)' : '#003366',
                },
                '&.Mui-focused fieldset': {
                  borderColor: isSidebar ? '#FFD700' : '#003366',
                },
                '& textarea': {
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                },
                '& textarea::-webkit-scrollbar': { width: 6, height: 6 },
                '& textarea::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '& textarea::-webkit-scrollbar-thumb': {
                  bgcolor: isSidebar ? 'rgba(255,215,0,0.35)' : 'rgba(100,116,139,0.4)',
                  borderRadius: 6,
                  border: '1px solid transparent',
                  backgroundClip: 'padding-box',
                  '&:hover': {
                    bgcolor: isSidebar ? 'rgba(255,215,0,0.5)' : 'rgba(100,116,139,0.6)',
                  },
                },
              },
              endAdornment: (
                <InputAdornment
                  position="end"
                  sx={{
                    height: '100%',
                    maxHeight: 'none',
                    alignSelf: 'center',
                    m: 0,
                    ml: 0.5,
                  }}
                >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Tooltip title={isListening ? "Escuchando..." : "Consulta por voz"}>
                    <IconButton
                      size="small"
                      onClick={toggleListening}
                      disabled={isLoading}
                      sx={{
                        color: isListening ? '#ef4444' : (isSidebar ? 'rgba(255,255,255,0.6)' : '#64748b'),
                        animation: isListening ? 'pulse 1.5s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { transform: 'scale(1)', opacity: 1 },
                          '50%': { transform: 'scale(1.2)', opacity: 0.7 },
                          '100%': { transform: 'scale(1)', opacity: 1 },
                        },
                        '&:hover': {
                          color: isListening ? '#dc2626' : (isSidebar ? '#FFD700' : '#003366'),
                        }
                      }}
                    >
                      <MicIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    sx={{
                      color: isSidebar ? '#FFD700' : '#003366',
                      '&.Mui-disabled': {
                        color: isSidebar ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                      },
                    }}
                  >
                    {isLoading ? <CircularProgress size={18} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Box>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Box>
  );
}
