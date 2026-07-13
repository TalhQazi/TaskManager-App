export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  fullName: string;
  phone: string;
  jobTitle: string;
  department: string;
  company: string;
  hireDate?: string;
  role: 'employee' | 'manager' | 'admin' | 'super-admin';
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  assignedDate: string;
  dueDate: string;
  notes: string[];
  images: string[];
  category: string;
  assignees?: string[];
  location?: string;
}

export interface TimeEntry {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: 'clocked_in' | 'clocked_out' | 'not_started';
}

export interface ScheduleShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  role: string;
  tasks: string[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  read: boolean;
  conversationId: string;
}

export interface Conversation {
  id: string;
  participantName: string;
  participantRole: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'message' | 'system' | 'schedule';
  read: boolean;
  timestamp: string;
}

export interface DashboardSummary {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  isClockedIn: boolean;
  todayHours: number;
  weeklyHours: number;
  unreadMessages: number;
  upcomingShifts: number;
  notifications: Notification[];
}
