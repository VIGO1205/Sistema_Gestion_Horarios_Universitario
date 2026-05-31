import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Forzar el adaptador de WebSockets (Socket.IO) para evitar error de driver
  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: process.env.FRONTEND_URL || true, // Permite el origen de la petición o uno específico
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new LoggerInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Helmet para seguridad básica de cabeceras
  app.use(helmet());

  // Rate Limiting global
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // Límite de 100 peticiones por ventana de tiempo por IP
      message: 'Demasiadas peticiones desde esta IP, por favor intenta después de 15 minutos',
    }),
  );

  // Rate Limiting específico para login
  app.use(
    '/auth/login',
    rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 5, // Límite de 5 intentos de login por minuto por IP
      message: 'Demasiados intentos de inicio de sesión, intenta en un minuto',
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend corriendo en: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('FATAL ERROR AL INICIAR LA APLICACIÓN:');
  console.error(error);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});
