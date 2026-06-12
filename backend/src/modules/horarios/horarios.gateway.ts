import { WebSocketGateway, WebSocketServer, OnGatewayInit, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ 
  namespace: '/horarios', 
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
})
export class HorariosGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(HorariosGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log('Horarios WebSocket Gateway inicializado');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado a horarios: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado de horarios: ${client.id}`);
  }

  @SubscribeMessage('horarios:subscribe')
  handleSubscribe(client: Socket, data: { cicloId: number }) {
    const room = `ciclo_${data.cicloId}`;
    client.join(room);
    this.logger.log(`Cliente ${client.id} suscrito al room: ${room}`);
    return { event: 'horarios:subscribed', data: { cicloId: data.cicloId } };
  }

  @SubscribeMessage('configuracion:change')
  handleConfigChange(client: Socket, newConfig: any) {
    this.logger.log(`Cambio de configuración recibido de ${client.id}`);
    // Re-emitimos la nueva configuración a todos los demás clientes
    this.server.emit('configuracion:update', newConfig);
  }

  emitUpdate(cicloId: number) {
    const room = `ciclo_${cicloId}`;
    this.logger.log(`Emitiendo actualización al room: ${room}`);
    this.server.to(room).emit('horarios:update', { 
      cicloId, 
      timestamp: new Date().getTime() 
    });
    
    // También emitimos globalmente por si acaso algún cliente no está en un room
    this.server.emit('horarios:update', { 
      cicloId, 
      timestamp: new Date().getTime() 
    });
  }
}
