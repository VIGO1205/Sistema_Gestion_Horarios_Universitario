import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/notificaciones', cors: { origin: '*' } })
export class NotificacionesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificacionesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Notificaciones WebSocket Gateway inicializado');
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token) {
      this.logger.warn(`Cliente ${client.id} conectado sin token`);
      return;
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'secret-key';
      const payload = this.jwtService.verify(token, { secret });
      const docenteId = payload.docenteId;
      if (docenteId) {
        const room = `docente_${docenteId}`;
        client.join(room);
        this.logger.log(`Cliente ${client.id} autenticado como docente ${docenteId}`);
      } else {
        this.logger.log(`Cliente ${client.id} conectado sin docenteId (rol: ${payload.rol})`);
      }
    } catch {
      this.logger.warn(`Cliente ${client.id} conectado con token inválido`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente ${client.id} desconectado de notificaciones`);
  }

  notifyStatusChange(docenteId: number, data: any) {
    this.server.to(`docente_${docenteId}`).emit('notificaciones:estado-carga', {
      docenteId,
      ...data
    });
  }
}
