import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinTask: (taskId: string) => void;
  leaveTask: (taskId: string) => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  emitTyping: (taskId: string, username: string) => void;
  emitStopTyping: (taskId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    return {
      socket: null,
      isConnected: false,
      joinTask: () => {},
      leaveTask: () => {},
      joinProject: () => {},
      leaveProject: () => {},
      emitTyping: () => {},
      emitStopTyping: () => {},
    } as SocketContextType;
  }
  return context;
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connectSocket = async () => {
      // Must be authenticated or have a stored token/user
      let activeToken = token;
      let activeUser = user;

      if (!activeToken) {
        activeToken = await AsyncStorage.getItem("auth_token");
      }
      if (!activeUser) {
        const storedUser = await AsyncStorage.getItem("auth_user");
        if (storedUser) {
          try {
            activeUser = JSON.parse(storedUser);
          } catch {}
        }
      }

      if (!activeToken && !activeUser) {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setIsConnected(false);
        }
        return;
      }

      // If existing socket is connected with same credentials, don't recreate
      if (socketRef.current?.connected) {
        return;
      }

      const socket = io("https://task.se7eninc.com", {
        path: "/api/socket.io/",
        transports: ["websocket"],
        auth: { token: activeToken || "" },
        query: { token: activeToken || "" },
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        if (!isMounted) return;
        setIsConnected(true);
        console.log("[SocketContext] Connected to socket.io:", socket.id);

        const username = activeUser?.username || activeUser?.email || "";
        const name = activeUser?.fullName || activeUser?.username || "";
        const role = activeUser?.role || "employee";
        const email = activeUser?.email || "";

        socket.emit("register-user", { username, name, role, email });
      });

      socket.on("disconnect", (reason) => {
        if (!isMounted) return;
        setIsConnected(false);
        console.log("[SocketContext] Socket disconnected:", reason);
      });

      socket.on("connect_error", (err) => {
        console.warn("[SocketContext] Socket connection error:", err.message);
      });
    };

    if (isAuthenticated) {
      connectSocket();
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    }

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, token, user]);

  const joinTask = useCallback((taskId: string) => socketRef.current?.emit("join-task", taskId), []);
  const leaveTask = useCallback((taskId: string) => socketRef.current?.emit("leave-task", taskId), []);
  const joinProject = useCallback((projectId: string) => socketRef.current?.emit("join-project", projectId), []);
  const leaveProject = useCallback((projectId: string) => socketRef.current?.emit("leave-project", projectId), []);
  const emitTyping = useCallback((taskId: string, username: string) => socketRef.current?.emit("typing", { taskId, username }), []);
  const emitStopTyping = useCallback((taskId: string) => socketRef.current?.emit("stop-typing", { taskId }), []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, joinTask, leaveTask, joinProject, leaveProject, emitTyping, emitStopTyping }}>
      {children}
    </SocketContext.Provider>
  );
}