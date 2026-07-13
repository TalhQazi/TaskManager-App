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

  /**
   * Resolves the target real-time streaming endpoint for your development 
   * or production workspace topology.
   */
  private resolveHost(): string {
    if (process.env.EXPO_PUBLIC_WS_HOST) {
      return process.env.EXPO_PUBLIC_WS_HOST;
    }
    // Safe standard mobile socket proxy targeting your primary microservice cluster
    return "https://task.se7eninc.com:8080";
  }

  connect(handlers: WebSocketHandlers) {
    this.handlers = handlers;
    if (this.socket) return; 

    const absoluteTargetUrl = this.resolveHost();

    this.socket = io(absoluteTargetUrl, {
      transports: ["websocket"],
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.socket.on("connect", () => {
      console.log("[Announcements WS Node] Native Channel Established");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      console.log("[Announcements WS Node] Connection severed, attempting retry lifecycle");
      this.attemptReconnect();
    });

    this.socket.on("error", (error) => {
      console.error("[Announcements WS Node] Pipeline Exception:", error);
      this.handlers.onError?.(error);
    });

    // Native Bindings Configuration
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
    } else {
      console.error("[Announcements WS Node] Max reconnection attempts reached");
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

/* Singleton Core Wrapper Instance */
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