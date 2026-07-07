import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage"; 

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
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connectSocket = async () => {
      // Mobile: Retrieve auth from AsyncStorage
      const authRaw = await AsyncStorage.getItem("taskflow_auth");
      const empRaw = await AsyncStorage.getItem("employee_auth");
      
      if (!authRaw && !empRaw) return;

      const socket = io("https://task.se7eninc.com", {
        path: "/api/socket.io/",
        transports: ["websocket"], // WebSocket is preferred on mobile
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on("connect", async () => {
        if (!isMounted) return;
        setIsConnected(true);

        // Register User Logic
        let userData = { username: "", name: "", role: "" };
        try {
          if (authRaw) {
            const auth = JSON.parse(authRaw);
            userData = { username: auth.username || auth.name, name: auth.name, role: auth.role };
          } else if (empRaw) {
            const emp = JSON.parse(empRaw);
            userData = { username: emp.name || emp.username, name: emp.name, role: "employee" };
          }
          socket.emit("register-user", userData);
        } catch (e) {
          console.error("Auth Parse Error", e);
        }
      });

      socket.on("disconnect", () => {
        if (isMounted) setIsConnected(false);
      });
    };

    connectSocket();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
    };
  }, []);

  // Callback functions remain the same
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