import { io, type Socket } from "socket.io-client";

interface WebSocketHandlers {
  onNewAnnouncement?: (data: any) => void;
  onAnnouncementPublished?: (data: any) => void;
  onAnnouncementUpdated?: (data: any) => void;
  onAnnouncementDeleted?: (data: any) => void;
  onAnnouncementExpired?: (data: any) => void;
  onAnnouncementAcknowledged?: (data: any) => void;
  onAnnouncementRepeated?: (data: any) => void;
  onError?: (error: any) => void;
}

class AnnouncementWebSocket {
  private socket: Socket | null = null;
  private handlers: WebSocketHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  private resolveHost(): string {
    return process?.env?.NEXT_PUBLIC_WS_HOST || "192.168.31.130:8080";
  }

  connect(handlers: WebSocketHandlers) {
    this.handlers = handlers;
    if (this.socket) return;

    const host = this.resolveHost();
    const url = host.startsWith("http") ? host : `ws://${host}`;

    this.socket = io(url, {
      transports: ["websocket"],
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.socket.on("connect", () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      this.attemptReconnect();
    });

    this.socket.on("error", (error) => {
      this.handlers.onError?.(error);
    });

    this.socket.on("new-announcement", (data) => this.handlers.onNewAnnouncement?.(data));
    this.socket.on("announcement-published", (data) => this.handlers.onAnnouncementPublished?.(data));
    this.socket.on("announcement-updated", (data) => this.handlers.onAnnouncementUpdated?.(data));
    this.socket.on("announcement-deleted", (data) => this.handlers.onAnnouncementDeleted?.(data));
    this.socket.on("announcement-expired", (data) => this.handlers.onAnnouncementExpired?.(data));
    this.socket.on("announcement-acknowledged", (data) => this.handlers.onAnnouncementAcknowledged?.(data));
    this.socket.on("announcement-repeated", (data) => this.handlers.onAnnouncementRepeated?.(data));
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;
      setTimeout(() => {
        this.socket?.disconnect();
        this.socket = null;
        this.connect(this.handlers);
      }, delay);
    }
  }

  send(data: any) {
    if (this.socket?.connected) {
      this.socket.emit("message", data);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

let wsInstance: AnnouncementWebSocket | null = null;

export function getAnnouncementWebSocket(): AnnouncementWebSocket {
  if (!wsInstance) {
    wsInstance = new AnnouncementWebSocket();
  }
  return wsInstance;
}

export function useAnnouncementWebSocket(handlers: WebSocketHandlers) {
  const ws = getAnnouncementWebSocket();
  ws.connect(handlers);
  return () => {
    ws.disconnect();
  };
}

export default AnnouncementWebSocket;