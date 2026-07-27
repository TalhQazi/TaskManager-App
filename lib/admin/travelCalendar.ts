import { apiFetch } from "./apiClient";

export interface TravelCalendar {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  destination: string;
  purpose: "business" | "personal" | "conference" | "meeting" | "training" | "other";
  status: "planned" | "approved" | "in-progress" | "completed" | "cancelled";
  employee: { _id: string; name: string; email: string; };
  budget: { estimated: number; actual: number; currency: string; };
  notes?: string;
  visibility: "private" | "team" | "department" | "company";
}

export interface TravelCalendarFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  employee?: string;
  purpose?: string;
  [key: string]: any;
}

export interface TravelCalendarCreateRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  destination: string;
  purpose?: "business" | "personal" | "conference" | "meeting" | "training" | "other";
  status?: "planned" | "approved" | "in-progress" | "completed" | "cancelled";
  budget?: { estimated?: number; actual?: number; currency?: string; };
  notes?: string;
  visibility?: "private" | "team" | "department" | "company";
}

export interface TravelCalendarUpdateRequest extends Partial<TravelCalendarCreateRequest> {}

class TravelCalendarApi {
  private baseUrl = "/api/travel-calendar";

  private parseErrorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : "Travel calendar feature not available";
  }

  // Get all travel calendars
  async getTravelCalendars(filters?: Record<string, any>) {
    try {
      // Clean query construction mapping loop
      let queryString = "";
      if (filters) {
        const parts: string[] = [];
        Object.keys(filters).forEach((key) => {
          const val = filters[key];
          if (val !== undefined && val !== null && val !== "") {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
          }
        });
        if (parts.length > 0) queryString = `?${parts.join("&")}`;
      }
      return await apiFetch<any>(`${this.baseUrl}${queryString}`);
    } catch (error) {
      console.warn("Travel calendar API offline layout fallback");
      return { success: true, data: { items: [], total: 0 } };
    }
  }

  // Create new travel calendar
  async createTravelCalendar(data: TravelCalendarCreateRequest) {
    try {
      return await apiFetch<any>(this.baseUrl, {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (error) {
      return { success: false, error: { message: this.parseErrorMessage(error) } };
    }
  }

  // Update travel calendar
  async updateTravelCalendar(id: string, data: TravelCalendarUpdateRequest) {
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

  async getTravelCalendarById(id: string) {
    try {
      return await apiFetch<any>(`${this.baseUrl}/${encodeURIComponent(id)}`);
    } catch (error) {
      console.warn("Exception processed in sequence identification lookup");
      throw new Error("Travel calendar not available");
    }
  }


  async getTravelStatistics() {
    try {
      return await apiFetch<any>(`${this.baseUrl}/statistics`);
    } catch (error) {
      console.warn("Metrics routing pipeline bypassed internally");
      return null;
    }
  }

  
}






export const travelCalendarApi = new TravelCalendarApi();