import { API_BASE_URL } from "@/services/api";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL_EMP = API_BASE_URL || "https://task.se7eninc.com";

export interface MobileUploadBlob {
  uri: string;
  name: string;
  type: string;
}

export interface ItineraryStop {
  _id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  estimatedDurationMinutes: number;
  sequenceOrder: number;
  travelTimeToNext: number;
  taskId?: string | null;
  locationId?: string | null;
  completed: boolean;
  completedAt?: string | null;
}

export interface Itinerary {
  id: string;
  _id: string;
  userId: string;
  date: string;
  startTime: string;
  stops: ItineraryStop[];
  optimized: boolean;
}

export async function employeeApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL_EMP}${endpoint}`;
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  const authRaw = await AsyncStorage.getItem("employee_auth");
  if (authRaw) {
    try {
      const auth = JSON.parse(authRaw);
      if (auth.token) {
        headers["Authorization"] = `Bearer ${auth.token}`;
      }
    } catch (e) {
      console.error("Authentication mapping fault:", e);
    }
  }

  if (!headers["Authorization"]) {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Network layer exception status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getMyLeaveRequests() {
  return employeeApiFetch<{
    items: Array<{
      id?: string;
      _id?: string;
      employeeName: string;
      type: "pto" | "vacation" | "sick" | "holiday" | "unpaid" | "other";
      startDate: string;
      endDate: string;
      status: "pending" | "approved" | "rejected";
      reason?: string;
      exemptFromEOD?: boolean;
      createdAt?: string;
    }>;
  }>("/api/leave-requests/me");
}

export async function createLeaveRequest(payload: {
  type: "pto" | "vacation" | "sick" | "holiday" | "unpaid" | "other";
  startDate: string;
  endDate: string;
  reason?: string;
  exemptFromEOD?: boolean;
}) {
  return employeeApiFetch<{ item: unknown }>("/api/leave-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteLeaveRequest(id: string) {
  return employeeApiFetch<{ success: boolean }>(`/api/leave-requests/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function toProxiedUrl(url: string | undefined): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  const s3Pattern = /^https:\/\/([\w.-]+)\.s3\.([\w.-]+)\.amazonaws\.com\/(.+)$/;
  const match = url.match(s3Pattern);

  if (match) {
    const key = match[3];
    let token = "";
    const authRaw = await AsyncStorage.getItem("employee_auth");
    if (authRaw) {
      try {
        const parsed = JSON.parse(authRaw);
        token = parsed.token || "";
      } catch (e) {
        void e;
      }
    }
    return `${API_BASE_URL_EMP}/s3-proxy/${key}${token ? `?token=${token}` : ""}`;
  }

  return url;
}

export async function employeeLogin(username: string, password: string) {
  return employeeApiFetch<{ token: string; user: { username: string; role: string } }>(
    "/api/auth/employee-login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }
  );
}

export async function getEmployeeProfile() {
  return employeeApiFetch<{
    item: {
      id: string;
      name: string;
      email: string;
      role: string;
      phone?: string;
      company?: string;
      location?: string;
      status?: string;
      current_status?: "AVAILABLE" | "LUNCH" | "BREAK";
      lunch_start_time?: string | null;
      lunch_expected_end?: string | null;
      break_start_time?: string | null;
    };
  }>("/api/employees/me");
}

export async function deliverVideoMessage() {
  return employeeApiFetch<{
    item: {
      deliveryId: string;
      messageType: string;
      title: string;
      subtitle?: string;
      videoUrl: string;
      deliveredAt?: string;
      acknowledgedAt?: string | null;
    } | null;
  }>("/api/video/deliver", {
    method: "POST",
  });
}

export async function acknowledgeVideoMessage(deliveryId: string, response?: string, watchDuration?: number, replayCount?: number) {
  return employeeApiFetch<{ item: any }>("/api/video/acknowledge", {
    method: "POST",
    body: JSON.stringify({
      deliveryId,
      response: response || "",
      ...(typeof watchDuration === "number" ? { watchDuration } : {}),
      ...(typeof replayCount === "number" ? { replayCount } : {}),
    }),
  });
}

export async function replayVideoMessage(deliveryId: string) {
  return employeeApiFetch<{ item: { replayCount: number } }>("/api/video/replay", {
    method: "POST",
    body: JSON.stringify({ deliveryId }),
  });
}

export async function getVideoHistory(employeeId: string) {
  return employeeApiFetch<{ items: Array<{ id: string; employeeId: string; videoMessageId: string; messageType: string; deliveredAt: string; acknowledgedAt?: string | null; watchDuration?: number; response?: string; replayCount?: number; videoTitle: string; videoSubtitle: string; videoUrl: string }> }>(
    `/api/user/${encodeURIComponent(employeeId)}/video-history`
  );
}

export async function getEmployeeTasks() {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      dueDate: string;
      createdAt?: string;
      dueTime?: string;
      assignees?: string[];
      attachmentFileName?: string;
      attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number } | null;
    }>;
  }>("/api/employees/me/tasks");
}

export async function getEmployeeTimeEntryHistory() {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      date: string;
      clockIn: string;
      clockOut: string;
      clockInAt: string | null;
      clockOutAt: string | null;
      totalHours: number;
      status: string;
      scrum?: string | null;
    }>;
  }>("/api/employees/me/time-entry/history");
}

export async function submitScrumAndClockOut(scrum: string) {
  return employeeApiFetch<{
    item: {
      id: string;
      date: string;
      clockIn: string;
      clockOut: string;
      status: string;
      totalHours: number;
      scrum: string;
    };
  }>("/api/employees/me/clock-out-with-scrum", {
    method: "POST",
    body: JSON.stringify({ scrum }),
  });
}

export async function submitEODReport(data: {
  inputType?: "text" | "voice";
  tasksCompleted: string;
  issuesBlockers?: string;
  notes?: string;
  transcription?: string;
}) {
  return employeeApiFetch<{
    item: {
      id: string;
      userId: string;
      date: string;
      rawInput: string;
      inputType: string;
      status: string;
      createdAt: string;
      transcription?: string;
      aiSummary?: string;
      productivityScore?: number;
      flags?: { missing?: boolean; lowOutput?: boolean };
    };
  }>("/api/employees/me/eod-report", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getEmployeeEODReports(params?: { from?: string; to?: string }) {
  const qs = new Array<string>();
  if (params?.from) qs.push(`from=${encodeURIComponent(params.from)}`);
  if (params?.to) qs.push(`to=${encodeURIComponent(params.to)}`);
  const queryString = qs.length > 0 ? `?${qs.join("&")}` : "";
  return employeeApiFetch<{
    items: Array<{
      id: string;
      userId: string;
      employeeName: string;
      date: string;
      rawInput: string;
      inputType: string;
      status: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }>(`/api/employees/me/eod-reports${queryString}`);
}

export async function getEmployeeScrumRecords() {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      date: string;
      clockIn: string;
      clockOut: string;
      totalHours: number;
      scrum: string;
      createdAt: string;
    }>;
  }>("/api/employees/me/scrum-records");
}

export async function getTaskById(taskId: string) {
  return employeeApiFetch<{
    item: {
      id: string;
      title: string;
      description: string;
      assignees?: string[];
      priority?: string;
      status?: string;
      dueDate?: string | null;
      dueTime?: string;
      createdAt?: string;
      attachmentFileName?: string;
      attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
      attachments?: Array<{ fileName: string; url: string; mimeType: string; size: number }>;
      updatedAt?: string;
    };
  }>(`/api/tasks/${encodeURIComponent(taskId)}`);
}

export async function updateTaskStatus(taskId: string, status: string) {
  return employeeApiFetch<{ item: unknown }>(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function getTaskComments(taskId: string) {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      taskId: string;
      message: string;
      authorUserId: string;
      authorUsername: string;
      authorRole: string;
      createdAt: string;
    }>;
  }>(`/api/tasks/${encodeURIComponent(taskId)}/comments`);
}

export async function addTaskComment(taskId: string, message: string) {
  return employeeApiFetch<{
    item: {
      id: string;
      taskId: string;
      message: string;
      authorUserId: string;
      authorUsername: string;
      authorRole: string;
      createdAt: string;
    };
  }>(`/api/tasks/${encodeURIComponent(taskId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function getEmployeeDashboard() {
  return employeeApiFetch<{
    item: {
      tasks: { total: number; completed: number; pending: number; inProgress: number };
      clock: { clockIn: string; clockOut: string; status: string };
      scheduleCount: number;
      unreadMessages: number;
      recentTasks: Array<{ id: string; title: string; status: string; priority: string; dueDate: string }>;
    }
  }>("/api/employees/me/dashboard");
}

export async function getEmployeeSchedule() {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      title: string;
      day: string;
      location: string;
      startTime: string;
      endTime: string;
      type: string;
    }>
  }>("/api/employees/me/schedule");
}

export async function getTodayTimeEntry() {
  return employeeApiFetch<{
    item: {
      id: string;
      date: string;
      clockIn: string;
      clockOut: string;
      clockInAt: string | null;
      clockOutAt: string | null;
      totalHours: number;
      status: string;
    } | null;
  }>("/api/employees/me/time-entry/today");
}

export async function clockIn() {
  return employeeApiFetch<{
    item: { id: string; date: string; clockIn: string; clockOut: string; status: string };
  }>("/api/employees/me/clock-in", { method: "POST" });
}

export async function clockOut() {
  return employeeApiFetch<{
    item: { id: string; date: string; clockIn: string; clockOut: string; status: string; totalHours: number };
  }>("/api/employees/me/clock-out", { method: "POST" });
}

export async function getEmployeeConversations(employeeName: string) {
  return employeeApiFetch<{
    items: Array<{
      employee: { id: string; name: string; email: string; department: string; status: string; initials: string; avatarUrl?: string; current_status?: string; lunch_start_time?: string | null; lunch_expected_end?: string | null; break_start_time?: string | null };
      lastMessage: { id: string; content: string; timestamp: string; sender: string; status: string } | null;
      unreadCount: number;
    }>;
  }>(`/api/messages/conversations/${encodeURIComponent(employeeName)}`);
}

export async function getConversation(user1: string, user2: string) {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      sender: string;
      recipient: string;
      content: string;
      timestamp: string;
      type: string;
      status: string;
      attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
    }>;
  }>(`/api/messages/conversation/${encodeURIComponent(user1)}/${encodeURIComponent(user2)}`);
}

export async function sendMessage(data: {
  sender: string;
  recipient: string;
  content: string;
  timestamp: string;
  type: "direct";
  status?: string;
  attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number };
}) {
  return employeeApiFetch<{
    item: { id: string; sender: string; recipient: string; content: string; timestamp: string; type: string; status: string; attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number } };
  }>("/api/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function uploadMessageAttachment(file: MobileUploadBlob) {
  const fd = new FormData();
  fd.append("file", file as any);
  return employeeApiFetch<{
    attachment: { fileName: string; url: string; mimeType: string; size: number };
  }>("/api/messages/upload", {
    method: "POST",
    body: fd,
  });
}

export async function markMessagesAsRead(sender: string, recipient: string) {
  return employeeApiFetch<{ success: boolean; message: string }>("/api/messages/mark-read", {
    method: "POST",
    body: JSON.stringify({ sender, recipient }),
  });
}

export async function toggleMessageReaction(messageId: string, emoji: string, username: string) {
  return employeeApiFetch<{ messageId: string; reactions: Array<{ emoji: string; username: string }> }>(
    `/api/messages/${encodeURIComponent(messageId)}/react`,
    {
      method: "POST",
      body: JSON.stringify({ emoji, username }),
    }
  );
}

export async function getPersonalNotes() {
  return employeeApiFetch<{ items: Array<{ id: string; title: string; content: string; color: string; isPinned: boolean; updatedAt: string }> }>("/api/notes");
}

export async function createPersonalNote(payload: { title: string; content: string; color?: string; isPinned?: boolean }) {
  return employeeApiFetch<{ item: unknown }>("/api/notes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updatePersonalNote(id: string, payload: unknown) {
  return employeeApiFetch<{ item: unknown }>(`/api/notes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function deletePersonalNote(id: string) {
  return employeeApiFetch<{ success: boolean }>(`/api/notes/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

export async function downloadViaUrl(url: string, fileName: string): Promise<string> {
  return new Promise((resolve) => {
    resolve(`${url}/${fileName}`);
  });
}

export async function getEmployeePayroll() {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      payPeriod: string;
      gross: number;
      net: number;
      taxes: number;
      deductions: number;
      pdfUrl: string;
    }>;
  }>("/api/employees/me/payroll");
}

export async function getEmployeeTaxDocs(year?: number) {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      year: number;
      type: string;
      fileUrl: string;
    }>;
  }>(`/api/employees/me/tax-docs${year ? `?year=${year}` : ""}`);
}

export async function getEmployeeTimeLogs() {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      date: string;
      clockIn: string;
      clockOut: string;
      totalHours: number;
    }>;
  }>("/api/employees/me/time-logs");
}

export async function getEmployeeDocuments() {
  return employeeApiFetch<{
    items: Array<{
      id: string;
      docType: string;
      status: string;
      fileUrl: string;
    }>;
  }>("/api/employees/me/documents");
}

export async function updateEmployeeProfile(data: any) {
  return employeeApiFetch<{ item: any }>("/api/employees/me/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export const updateBankInfo = (data: any) =>
  employeeApiFetch("/api/employees/me/profile/bank", {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const updateTaxInfo = (data: any) =>
  employeeApiFetch("/api/employees/me/profile/tax", {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const uploadDocument = (formData: FormData) =>
  employeeApiFetch("/api/employees/me/documents", {
    method: "POST",
    body: formData,
  });

export const getDocuments = () =>
  employeeApiFetch("/api/employees/me/documents");

export async function updateComment(
  taskId: string,
  commentId: string,
  payload: { message: string }
): Promise<{ item: { id: string; message: string; updatedAt: string } }> {
  return employeeApiFetch<{ item: { id: string; message: string; updatedAt: string } }>(`/api/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteComment(
  taskId: string,
  commentId: string
): Promise<{ ok: true }> {
  return employeeApiFetch<{ ok: true }>(`/api/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
}

export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
  return employeeApiFetch<{ success: boolean }>(`/api/messages/${encodeURIComponent(notificationId)}/mark-read`, {
    method: "POST"
  });
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  return employeeApiFetch<{ success: boolean }>("/api/messages/mark-all-read", {
    method: "POST"
  });
}

export async function getOnboardingStatus(): Promise<{ item: { overallStatus: string; progress: number } }> {
  return employeeApiFetch<{ item: { overallStatus: string; progress: number } }>("/api/onboarding/me");
}

export async function getUIPreferences(): Promise<{ item: any }> {
  return employeeApiFetch<{ item: any }>("/api/ui-preferences");
}

export async function updateUIPreferences(preferences: any): Promise<{ item: any }> {
  return employeeApiFetch<{ item: any }>("/api/ui-preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  });
}

export async function resetUIPreferences(): Promise<{ item: any; message: string }> {
  return employeeApiFetch<{ item: any; message: string }>("/api/ui-preferences/reset", {
    method: "POST",
  });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  return employeeApiFetch<void>(`/api/messages/${encodeURIComponent(notificationId)}`, {
    method: "DELETE"
  });
}

export async function startLunch() {
  return employeeApiFetch<{ ok: boolean; employee: any }>("/api/user/status/start-lunch", {
    method: "POST",
  });
}

export async function endLunch() {
  return employeeApiFetch<{ ok: boolean; employee: any }>("/api/user/status/end-lunch", {
    method: "POST",
  });
}

export async function startBreak() {
  return employeeApiFetch<{ ok: boolean; employee: any }>("/api/user/status/start-break", {
    method: "POST",
  });
}

export async function endBreak() {
  return employeeApiFetch<{ ok: boolean; employee: any }>("/api/user/status/end-break", {
    method: "POST",
  });
}

export async function getUserStatus(userId: string) {
  return employeeApiFetch<{
    current_status: "AVAILABLE" | "LUNCH" | "BREAK";
    lunch_start_time: string | null;
    lunch_expected_end: string | null;
    break_start_time: string | null;
  }>(`/api/user/${encodeURIComponent(userId)}/status`);
}

export async function getTeamStatuses() {
  return employeeApiFetch<{
    items: Array<{
      _id: string;
      name: string;
      current_status: "AVAILABLE" | "LUNCH" | "BREAK";
      lunch_start_time: string | null;
      lunch_expected_end: string | null;
      break_start_time: string | null;
    }>;
  }>("/api/team/statuses");
}

export async function getMyItinerary(date: string): Promise<{ item: Itinerary | null }> {
  return employeeApiFetch<{ item: Itinerary | null }>(`/api/itineraries/me?date=${encodeURIComponent(date)}`);
}

export async function completeItineraryStop(
  itineraryId: string,
  stopId: string,
  completed: boolean
): Promise<{ item: Itinerary }> {
  return employeeApiFetch<{ item: Itinerary }>(
    `/api/itineraries/${encodeURIComponent(itineraryId)}/stops/${encodeURIComponent(stopId)}/complete`,
    {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }
  );
}