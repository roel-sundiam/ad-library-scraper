import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: string;
  approved_at?: string;
  last_login?: string;
  approved_by_name?: string;
}

export interface AnalyticsData {
  pageStats: Array<{
    page_path: string;
    visits: number;
    unique_users: number;
  }>;
  dailyStats: Array<{
    date: string;
    visits: number;
    unique_users: number;
  }>;
  activityStats: Array<{
    action: string;
    count: number;
  }>;
  totalStats: {
    total_active_users: number;
    total_page_visits: number;
  };
  statusCounts: Array<{
    status: string;
    count: number;
  }>;
  recentUsers: AdminUser[];
  pendingUsers: AdminUser[];
  timeframe: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // User management
  getUsers(status?: string): Observable<{ success: boolean; data: { users: AdminUser[] } }> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    
    return this.http.get<{ success: boolean; data: { users: AdminUser[] } }>(
      `${this.baseUrl}/admin/users`,
      { params }
    );
  }

  approveUser(userId: number, action: 'approve' | 'reject'): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/users/${userId}/approve`, { action });
  }

  // Analytics
  getAnalytics(timeframe: string = '30d'): Observable<{ success: boolean; data: AnalyticsData }> {
    const params = new HttpParams().set('timeframe', timeframe);
    
    return this.http.get<{ success: boolean; data: AnalyticsData }>(
      `${this.baseUrl}/admin/analytics`,
      { params }
    );
  }
}