import { Controller, Get, Param, Res } from '@nestjs/common';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { Response } from 'express';

@Controller('public')
export class PublicController {
  
  @Get('uploads/:filename')
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const uploadsDir = join(process.cwd(), 'uploads');
    
    // Primero intentamos buscar el archivo exacto
    let filePath = join(uploadsDir, filename);
    
    if (existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    
    // Si no lo encuentra, intentamos buscar un archivo que contenga el nombre
    try {
      const files = readdirSync(uploadsDir);
      const matchedFile = files.find(file => file.includes(filename.split('.pdf')[0]));
      
      if (matchedFile) {
        filePath = join(uploadsDir, matchedFile);
        return res.sendFile(filePath);
      }
    } catch (e) {
      // Si no hay archivos, continuamos
    }
    
    return res.status(404).send({ 
      message: 'Archivo no encontrado. Por favor, vuelve a subir el PDF desde la sección de editar currícula.' 
    });
  }
}
