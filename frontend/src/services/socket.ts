import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private joinedRooms: Set<string> = new Set();

  connect(): Socket {
    if (!this.socket) {
      this.socket = io('https://sports-jf8d.onrender.com', {
        transports: ['websocket', 'polling'],
        withCredentials: false,
      });
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
  }

  joinMatch(matchId: string): void {
    if (this.socket) {
      if (!this.joinedRooms.has(matchId)) {
        this.socket.emit('joinMatch', matchId);
        this.joinedRooms.add(matchId);
      }
    }
  }

  leaveMatch(matchId: string): void {
    if (this.socket) {
      // server may not support leave; still clear local state to prevent re-joins
      this.joinedRooms.delete(matchId);
      // this.socket.emit('leaveMatch', matchId);
    }
  }

  updateScore(matchId: string, scoreData: any): void {
    if (this.socket) {
      this.socket.emit('updateScore', { matchId, scoreData });
    }
  }

  onScoreUpdate(callback: (data: any) => void): void {
    if (this.socket) {
      // Ensure we don't attach multiple identical listeners
      this.socket.off('scoreUpdated');
      this.socket.on('scoreUpdated', callback);
    }
  }

  offScoreUpdate(): void {
    if (this.socket) {
      this.socket.off('scoreUpdated');
    }
  }

  onError(callback: (error: any) => void): void {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }
}

export default new SocketService();
