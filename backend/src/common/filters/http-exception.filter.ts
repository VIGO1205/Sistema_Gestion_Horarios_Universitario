import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: any = { message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        payload = { message: exceptionResponse };
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        payload = {
          ...exceptionResponse,
          message: (exceptionResponse as any).message || exception.message,
        };
      } else {
        payload = { message: exception.message };
      }
    } else if (exception instanceof Error) {
      payload = { message: exception.message };
    }

    this.logger.error(`${request.method} ${request.url} - ${status} - ${payload.message}`);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...payload,
    });
  }
}
