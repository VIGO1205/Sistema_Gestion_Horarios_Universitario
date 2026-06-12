import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/notificaciones', cors: { origin: '*' } })
export class NotificacionesGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // Gateway de notificaciones inicializado
  }

  notifyStatusChange(docenteId: number, data: any) {
    this.server.emit('notificaciones:estado-carga', {
      docenteId,
      ...data
    });
  }
}
