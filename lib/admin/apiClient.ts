import { API_BASE_URL } from "@/services/api";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── Core Types & Interfaces ──────────────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// ─── ClearHire Compliance Types ────────────────────────────────────────────────

export type ClearHireStatus = "PENDING" | "GREEN" | "YELLOW" | "RED";

export interface ClearHireAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  startDate: string;
  endDate?: string | null;
}

export interface ClearHireSubmitPayload {
  userId: string;
  employeeId?: string;
  fullName: string;
  dob: string;
  ssn: string;
  addressHistory: ClearHireAddress[];
  governmentIdUrl?: string;
  selfieUrl?: string;
  fcraConsentGiven: boolean;
}

export interface ClearHireProfile {
  id: string;
  userId: string;
  employeeId?: string | null;
  fullName: string;
  status: ClearHireStatus;
  score: number;
  flags: string[];
  lastChecked: string;
  fcraConsentGiven?: boolean;
  fcraConsentDate?: string;
  adminOverride?: {
    overriddenAt: string;
    previousStatus: string;
    reason: string;
  } | null;
  preAdverseActionSentAt?: string;
  finalAdverseActionSentAt?: string;
  createdAt: string;
  updatedAt: string;
}


export interface EmployeeProfile {
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
}


export interface TimeEntry {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  totalHours: number;
  status: string;
  scrum?: string | null;
} 

export interface EODReportPayload {
  inputType?: "text" | "voice";
  tasksCompleted: string;
  issuesBlockers?: string;
  notes?: string;
  transcription?: string;
}

export interface EODReportResponse {
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
}
// ─── Core Helper Functions ─────────────────────────────────────────────────────


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
  _id: string;
  id: string; // Sometimes your API might return 'id' or '_id', keeping both for safety
  startTime: string;
  stops: ItineraryStop[];
  // Add other itinerary fields as per your backend schema
}

export interface NativeFilePayload {
  uri: string;
  name: string;
  type: string;
}

export interface DashboardData {
  earnings: number;
  hoursWorked: number;
  alerts: string[];
  actions: Array<{
    type: string;
    label: string;
  }>;
  tasks: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
  };
  clock: {
    clockIn: string;
    clockOut: string;
    status: string;
  };
  scheduleCount: number;
  unreadMessages: number;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  }>;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  updatedAt: string;
}


/**
 * Retrieves the authorization JWT token from persistent device storage
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

/**
 * Helper to build safe query strings from object parameters
 */
const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return "";
  const filteredParams = Object.entries(params).filter(
    ([_, value]) => value !== undefined && value !== null && value !== ""
  );
  if (filteredParams.length === 0) return "";
  
  return "?" + filteredParams
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
};

// ─── Core Request Interceptor ──────────────────────────────────────────────────

/**
 * Core Request Interceptor handling cross-platform headers & token injection
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      console.log('[API] Unauthorized - clearing token');
      await AsyncStorage.removeItem('auth_token');
      throw new Error('Session expired. Please login again.');
    }

    if (response.status === 204) {
      return { data: {} as T, success: true };
    }

    const responseText = await response.text().catch(() => "");

    if (!response.ok) {
      const errorBody = responseText || 'Unknown error';
      console.log(`[API] Error ${response.status}: ${errorBody}`);
     // throw new Error(`Request failed: ${response.statusText}`);
     // throw new Error(`Request failed with Status ${response.status}: ${errorBody}`);
    }

    const data = responseText.trim() ? JSON.parse(responseText) : ({} as T);
    return { data, success: true };
  } catch (error) {
    console.log(`[API] Request failed:`, error);
    throw error;
  }
}

// ─── Legacy Web Context Mirror Wrappers ───────────────────────────────────────

/**
 * apiFetch_: Maps apiFetch directly to the /employees subset route.
 */
export const apiFetch_ = async <T,>(urlSuffix: string = "", init?: RequestInit): Promise<T> => {
  let cleanSuffix = urlSuffix;
  if (cleanSuffix.startsWith("/api/employees")) {
    cleanSuffix = cleanSuffix.replace("/api/employees", "");
  } else if (cleanSuffix.startsWith("employees")) {
    cleanSuffix = cleanSuffix.replace("employees", "");
  }

  const endpoint = `/employees${cleanSuffix.startsWith('/') ? cleanSuffix : '/' + cleanSuffix}`.replace(/\/+$/, '');
  const response = await apiRequest<T>(endpoint, init);
  return response.data;
};

/**
 * apiFetch: Automatically resolves paths needing custom /employees routing or direct root access.
 */
export const apiFetch = async <T,>(urlSuffix: string = "", init?: RequestInit): Promise<T> => {
  let endpoint = urlSuffix;

  if (endpoint.startsWith("/api/")) {
    endpoint = endpoint.replace(/^\/api/, "");
  } 
  else if (
    !endpoint.includes("asset-library") && 
    !endpoint.includes("brand-kits") &&
    !endpoint.startsWith("/employees") && 
    !endpoint.startsWith("employees")
  ) {
    const cleanSuffix = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    endpoint = `/employees${cleanSuffix}`;
  }

  const finalEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cleanEndpoint = finalEndpoint.replace(/\/+/g, '/').replace(/\/+$/, '');

  const response = await apiRequest<T>(cleanEndpoint, init);
  return response.data;
};

// ─── Dynamic Resource Handling Methods ─────────────────────────────────────────

export const listResource = async <T,>(resource: string, params?: Record<string, any>): Promise<T> => {
  const queryString = buildQueryString(params);
  const response = await apiRequest<T>(`/${resource}${queryString}`, {
    method: 'GET'
  });
  return response.data;
};

export const createResource = async <T,>(resource: string, data: any): Promise<T> => {
  const response = await apiRequest<T>(`/${resource}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
};

export const updateResource = async <T,>(resource: string, id: string | number, data: any): Promise<T> => {
  const response = await apiRequest<T>(`/${resource}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
};

export const deleteResource = async <T,>(resource: string, id: string | number): Promise<T> => {
  const response = await apiRequest<T>(`/${resource}/${id}`, {
    method: 'DELETE',
  });
  return response.data;
};

// ─── File Utilities ────────────────────────────────────────────────────────────

export const toProxiedUrl = (url: string): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const hostRoot = API_BASE_URL.replace('/api', '');
  return `${hostRoot}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const downloadViaUrl = async (url: string, fileName: string): Promise<void> => {
  try {
    const token = await getAuthToken();
    const safeFileName = fileName.replace(/[/\\?%*:|"<>\s]/g, '_');
    const localUri = `${FileSystem.documentDirectory}${safeFileName}`;

    const downloadResult = await FileSystem.downloadAsync(url, localUri, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (downloadResult.status !== 200) {
      throw new Error(`Server returned status code ${downloadResult.status}`);
    }

    const isSharingSupported = await Sharing.isAvailableAsync();
    if (isSharingSupported) {
      await Sharing.shareAsync(downloadResult.uri, { dialogTitle: `Save ${fileName}` });
    } else {
      Alert.alert("Success", `File downloaded to local directory:\n${safeFileName}`);
    }
  } catch (error) {
    console.log(`[Download Error]:`, error);
    Alert.alert("Download Failed", error instanceof Error ? error.message : "Could not retrieve asset.");
    throw error;
  }
};

// ─── Task Management & Contributors API ────────────────────────────────────────

export async function getTaskContributors(taskId: string) {
  return apiFetch<{ 
    items: Array<{ 
      userId: string; 
      name: string; 
      email: string; 
      role: string; 
      addedAt: string; 
      contributionType: string; 
      actions: string[]; 
      avatar?: string; 
      department?: string; 
      stats?: any 
    }>; 
    total: number 
  }>(`/api/contributors/task/${encodeURIComponent(taskId)}/contributors`);
}

export async function getTaskContributionHistory(taskId: string, limit?: number) {
  const queryString = limit ? `?limit=${limit}` : "";
  return apiFetch<{ items: any[]; total: number }>(
    `/api/contributors/task/${encodeURIComponent(taskId)}${queryString}`
  );
}

// ─── Task Comments API ─────────────────────────────────────────────────────────

export async function addComment(taskId: string, payload: { message: string; attachments?: any[] }) {
  return apiFetch<{ item: any }>(`/api/tasks/${encodeURIComponent(taskId)}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addTaskComment(taskId: string, message: string) {
  const res = await apiRequest<{
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
  return res.data;
}

export async function getTaskComments(taskId: string) {
  return apiFetch<{ items: any[] }>(`/api/tasks/${encodeURIComponent(taskId)}/comments`, {
    method: "GET",
  });
}

// ─── Employee EOD Reports API ──────────────────────────────────────────────────

export async function submitEODReport(payload: { rawInput: string; inputType: string; date?: string }) {
  return apiFetch<{ success: boolean; item: any }>("/api/eod-reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyEODReports(params?: { from?: string; to?: string }) {
  const query = buildQueryString(params);
  return apiFetch<{ items: any[] }>(`/api/eod-reports/me${query}`);
}

// ─── Manager EOD Reports API (Newly Ported) ───────────────────────────────────

export async function getEODReports(params?: { date?: string; employeeId?: string; status?: string }) {
  const queryString = buildQueryString(params);
  return apiFetch<{
    items: Array<{
      id: string;
      userId: string;
      employeeName: string;
      date: string;
      rawInput: string;
      inputType: string;
      status: "submitted" | "missing" | "late";
      createdAt: string;
      clockIn?: string;
      clockOut?: string;
      clockInAt?: string | null;
      clockOutAt?: string | null;
      totalHours?: number;
      aiSummary?: string;
      productivityScore?: number;
      flags?: string[];
    }>;
  }>(`/api/manager/eod-reports${queryString}`);
}

export async function getEODReportById(id: string) {
  return apiFetch<{
    item: {
      id: string;
      userId: string;
      employeeName: string;
      date: string;
      rawInput: string;
      inputType: string;
      status: "submitted" | "missing" | "late";
      createdAt: string;
      clockIn?: string;
      clockOut?: string;
      clockInAt?: string | null;
      clockOutAt?: string | null;
      totalHours?: number;
      aiSummary?: string;
      productivityScore?: number;
      flags?: string[];
    };
  }>(`/api/manager/eod-reports/${encodeURIComponent(id)}`);
}

export async function getEODStatus(date?: string) {
  const params = date ? { date } : undefined;
  const queryString = buildQueryString(params);
  return apiFetch<{
    items: Array<{
      employeeId: string;
      employeeName: string;
      status: "submitted" | "missing" | "late" | "not_clocked_in";
      clockIn?: string;
      clockOut?: string;
      clockInAt?: string | null;
      clockOutAt?: string | null;
      reportSubmittedAt?: string;
    }>;
  }>(`/api/manager/eod-status${queryString}`);
}

export async function getTeamTimeEntries(params?: { date?: string; employeeId?: string; page?: number; limit?: number }) {
  const queryString = buildQueryString(params);
  return apiFetch<{
    items: Array<{
      id: string;
      userId: string;
      employee: string;
      avatar: string;
      date: string;
      clockIn: string;
      clockOut: string;
      clockInAt: string | null;
      clockOutAt: string | null;
      breakTime: string;
      totalHours: number;
      status: string;
      location: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }>(`/api/manager/time-entries${queryString}`);
}

// ─── Admin EOD Reports Audit ───────────────────────────────────────────────────

export const getAdminEODStatus = async (date: string): Promise<any> => {
  const response = await apiRequest<any>(`/admin/eod-status?date=${date}`, {
    method: 'GET'
  });
  return response.data;
};

export const getAdminEODReports = async (params: Record<string, any>): Promise<any> => {
  const queryString = buildQueryString(params);
  const response = await apiRequest<any>(`/admin/eod-reports${queryString}`, {
    method: 'GET'
  });
  return response.data;
};

// ─── Candidate Onboarding Workflow API ─────────────────────────────────────────

export async function getMyOnboardingStatus() {
  return apiFetch<{ item: any }>("/api/onboarding/status");
}

export async function submitOnboardingStep(
  step: "basic-info" | "identity" | "w4" | "handbook" | "signature", 
  payload: any
) {
  return apiFetch<{ success: boolean }>(`/api/onboarding/step/${step}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadOnboardingDocument(formData: FormData) {
  return apiFetch<{ 
    success: boolean; 
    fileUrl: string; 
    fileName: string; 
    mimeType: string; 
  }>("/api/onboarding/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getEmployeeHandbook() {
  return apiFetch<{ 
    content: string; 
    version: string; 
    downloadUrl?: string; 
  }>("/api/onboarding/handbook", {
    method: "GET",
  });
}

export async function submitFinalOnboarding() {
  return apiFetch<{ 
    success: boolean; 
    message: string; 
    overallStatus: string; 
  }>("/api/onboarding/submit", {
    method: "POST",
  });
}

// ─── Admin Onboarding Controls API ─────────────────────────────────────────────

export async function getAdminOnboardingList(status?: string) {
  const queryString = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ items: any[] }>(`/api/onboarding/admin/all${queryString}`, {
    method: "GET"
  });
}

export async function getAdminOnboardingDetails(id: string) {
  return apiFetch<{ item: any }>(`/api/onboarding/admin/${id}`, {
    method: "GET"
  });
}

export async function approveOnboarding(id: string, comments?: string) {
  return apiFetch<any>(`/api/onboarding/admin/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify({ comments: comments || "" })
  });
}

export async function rejectOnboarding(id: string, reason: string) {
  return apiFetch<any>(`/api/onboarding/admin/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify({ reason })
  });
}

// ─── ClearHire Background Check API ────────────────────────────────────────────

export async function submitClearHire(payload: ClearHireSubmitPayload) {
  return apiFetch<{ item: ClearHireProfile }>("/api/clearhire/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getClearHireStatus(userId: string) {
  return apiFetch<{ item: ClearHireProfile }>(
    `/api/clearhire/status/${encodeURIComponent(userId)}`
  );
}

export async function recheckClearHire(userId: string) {
  return apiFetch<{ item: ClearHireProfile }>("/api/clearhire/recheck", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function overrideClearHire(userId: string, reason: string) {
  return apiFetch<{ item: ClearHireProfile }>("/api/clearhire/override", {
    method: "POST",
    body: JSON.stringify({ userId, reason }),
  });
}

export async function listClearHireProfiles(status?: ClearHireStatus) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ items: ClearHireProfile[]; total: number }>(
    `/api/clearhire/all${qs}`
  );
}

export async function sendPreAdverseNotice(userId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `/api/clearhire/${encodeURIComponent(userId)}/pre-adverse`,
    { method: "POST" }
  );
}

export async function sendFinalAdverseNotice(userId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `/api/clearhire/${encodeURIComponent(userId)}/final-adverse`,
    { method: "POST" }
  );
}

// ─── Authentication Sign-Out ───────────────────────────────────────────────────

export async function logout(): Promise<void> {
  try {
    await AsyncStorage.removeItem('auth_token');
  } catch (error) {
    console.log('[Auth] Error clearing token on logout:', error);
  }
}

export type CrudResource = "vehicles" | "employees" | "users";

function resourcePath(resource: CrudResource): string {
  return `/api/${resource}`;
}

export async function getResource<T>(resource: CrudResource, id: string): Promise<T> {
  const res = await apiFetch<{ item: T } | any>(
    `${resourcePath(resource)}/${encodeURIComponent(id)}`
  );
  return res?.item || res;
}

// ─── Travel Calendar Management API ───────────────────────────────────────────

export async function getTravelStatistics() {
  return apiFetch<any>("/api/travel-calendar/statistics", {
    method: "GET",
  });
}

export const getTravelCalendarList = async (params?: Record<string, any>): Promise<any> => {
  const queryString = buildQueryString(params);
  return apiFetch<any>(`/api/travel-calendar${queryString}`, {
    method: 'GET'
  });
};

export const getTravelCalendarItem = async (id: string): Promise<any> => {
  return apiFetch<any>(`/api/travel-calendar/${encodeURIComponent(id)}`, {
    method: 'GET'
  });
};

class TravelCalendarApi {
  private baseUrl = "/api/travel-calendar";

  private parseErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : "Travel calendar feature not available";
  }

  async createTravelCalendar(data: any) {
    try {
      return await apiFetch<any>(this.baseUrl, {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (error) {
      return { success: false, error: { message: this.parseErrorMessage(error) } };
    }
  }

  async updateTravelCalendar(id: string, data: any) {
    try {
      return await apiFetch<any>(`${this.baseUrl}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } catch (error) {
      return { success: false, error: { message: this.parseErrorMessage(error) } };
    }
  }

  async deleteTravelCalendar(id: string) {
    try {
      return await apiFetch<any>(`${this.baseUrl}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (error) {
      return { success: false, error: { message: this.parseErrorMessage(error) } };
    }
  }
}

export const travelCalendarApi = new TravelCalendarApi();




/**
 * Fetch today's current time entry status
 */
export async function getTodayTimeEntry() {
  return apiFetch<{ item: TimeEntry | null }>("/employees/me/time-entry/today");
}

/**
 * Trigger an employee clock-in action
 */
export async function clockIn() {
  return apiFetch<{ item: Omit<TimeEntry, 'clockInAt' | 'clockOutAt' | 'totalHours'> }>("/employees/me/clock-in", { 
    method: "POST" 
  });
}

/**
 * Submit scrum notes and clock out for the day
 */
export async function submitScrumAndClockOut(scrum: string) {
  return apiFetch<{ item: TimeEntry & { scrum: string } }>("/employees/me/clock-out-with-scrum", {
    method: "POST",
    body: JSON.stringify({ scrum }),
  });
}

/**
 * Fetch a list of past attendance logs
 */
export async function getEmployeeTimeEntryHistory() {
  return apiFetch<{ items: TimeEntry[] }>("/employees/me/time-entry/history");
}

/**
 * Fetch authenticated employee profile data
 */
export async function getEmployeeProfile() {
  return apiFetch<{ item: EmployeeProfile }>("/employees/me");
}



/**
 * Get current onboarding phase review details
 */
export async function getOnboardingStatus(): Promise<{ item: { overallStatus: string; progress: number } }> {
  return apiFetch<{ item: { overallStatus: string; progress: number } }>("/onboarding/me");
}

export async function getMyItinerary(date: string): Promise<{ item: Itinerary | null }> {
  return apiFetch<{ item: Itinerary | null }>(
    `/api/itineraries/me?date=${encodeURIComponent(date)}`
  );
}

export async function completeItineraryStop(
  itineraryId: string,
  stopId: string,
  completed: boolean
): Promise<{ item: Itinerary }> {
  return apiFetch<{ item: Itinerary }>(
    `/api/itineraries/${encodeURIComponent(itineraryId)}/stops/${encodeURIComponent(stopId)}/complete`,
    {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }
  );
}

export async function getEmployeeDashboard(): Promise<{ item: DashboardData }> {
  return apiFetch<{ item: DashboardData }>("/api/employees/me/dashboard");
}

export async function startLunch() {
  return apiFetch<{ ok: boolean; employee: any }>("/api/user/status/start-lunch", {
    method: "POST",
  });
}

export async function endLunch() {
  return apiFetch<{ ok: boolean; employee: any }>("/api/user/status/end-lunch", {
    method: "POST",
  });
}

export async function startBreak() {
  return apiFetch<{ ok: boolean; employee: any }>("/api/user/status/start-break", {
    method: "POST",
  });
}

export async function endBreak() {
  return apiFetch<{ ok: boolean; employee: any }>("/api/user/status/end-break", {
    method: "POST",
  });
}

export async function getEmployeeSchedule() {
  return apiFetch<{
    items: Array<{
      id: string;
      title: string;
      day: string;
      location: string;
      startTime: string;
      endTime: string;
      type: string;
    }>;
  }>("/api/employees/me/schedule");
}


export async function createLeaveRequest(payload: {
  type: "pto" | "vacation" | "sick" | "holiday" | "unpaid" | "other";
  startDate: string;
  endDate: string;
  reason?: string;
  exemptFromEOD?: boolean;
}) {
  return apiFetch<{ item: unknown }>("/api/leave-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteLeaveRequest(id: string) {
  return apiFetch<{ success: boolean }>(`/api/leave-requests/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getMyLeaveRequests() {
  return apiFetch<{
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



export async function getEmployeeConversations(employeeName: string) {
  return apiFetch<{
    items: Array<{
      employee: { 
        id: string; 
        name: string; 
        email: string; 
        department: string; 
        status: string; 
        initials: string; 
        avatarUrl?: string; 
        current_status?: string; 
        lunch_start_time?: string | null; 
        lunch_expected_end?: string | null; 
        break_start_time?: string | null; 
      };
      lastMessage: { id: string; content: string; timestamp: string; sender: string; status: string } | null;
      unreadCount: number;
    }>;
  }>(`/api/messages/conversations/${encodeURIComponent(employeeName)}`);
}

export async function getConversation(user1: string, user2: string) {
  return apiFetch<{
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
  return apiFetch<{
    item: { 
      id: string; 
      sender: string; 
      recipient: string; 
      content: string; 
      timestamp: string; 
      type: string; 
      status: string; 
      attachment?: { fileName?: string; url?: string; mimeType?: string; size?: number }; 
    };
  }>("/api/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function markMessagesAsRead(sender: string, recipient: string) {
  return apiFetch<{ success: boolean; message: string }>("/api/messages/mark-read", {
    method: "POST",
    body: JSON.stringify({ sender, recipient }),
  });
}

export async function uploadMessageAttachment(file: NativeFilePayload) {
  const fd = new FormData();
  
  // React Native requires an object with uri, name, and type properties
  // Cast as 'any' to bypass the TypeScript DOM-based File structure restriction
  fd.append("file", file as any);

  return apiFetch<{
    attachment: { fileName: string; url: string; mimeType: string; size: number };
  }>("/api/messages/upload", {
    method: "POST",
    body: fd,
    headers: {
      // Allow your custom fetch client to dynamically generate correct boundary headers
      "Content-Type": "multipart/form-data",
    },
  });
}

export async function getPersonalNotes() {
  return apiFetch<{ items: Note[] }>("/api/notes");
}

export async function createPersonalNote(payload: { title: string; content: string; color?: string; isPinned?: boolean }) {
  return apiFetch<{ item: Note }>("/api/notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePersonalNote(id: string, payload: Partial<Note>) {
  return apiFetch<{ item: Note }>(`/api/notes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deletePersonalNote(id: string) {
  return apiFetch<{ success: boolean }>(`/api/notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}


export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/api/messages/${encodeURIComponent(notificationId)}/mark-read`,
    { method: "POST" }
  );
}

/**
 * Dispatches a request to bulk-update and clear all unread notification markers.
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    "/api/messages/mark-all-read", 
    { method: "POST" }
  );
}

export async function deleteNotification(notificationId: string): Promise<void> {
  return apiFetch<void>(
    `/api/messages/${encodeURIComponent(notificationId)}`, 
    { method: "DELETE" }
  );
}

export async function getEmployeeScrumRecords() {
  return apiFetch<{
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


export async function getEmployeeTimeLogs() {
  return apiFetch<{
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
  return apiFetch<{
    items: Array<{
      id: string;
      docType: string;
      status: string;
      fileUrl: string;
    }>;
  }>("/api/employees/me/documents");
}
 
export const uploadDocument = (formData: FormData) =>
  apiFetch("/api/employees/me/documents", {
    method: "POST",
    body: formData,
  });

  export async function getVideoHistory(employeeId: string) {
  return apiFetch<{ items: Array<{ id: string; employeeId: string; videoMessageId: string; messageType: string; deliveredAt: string; acknowledgedAt?: string | null; watchDuration?: number; response?: string; replayCount?: number; videoTitle: string; videoSubtitle: string; videoUrl: string }> }>(
    `/api/user/${encodeURIComponent(employeeId)}/video-history`
  );
}



export default apiRequest;