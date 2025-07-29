import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface RegisterResponse {
  success: boolean;
  data: {
    message: string;
    userId: number;
    status: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrl;
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    const token = this.getToken();
    const user = this.getStoredUser();
    
    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
      
      // Verify token is still valid
      this.verifyToken().subscribe({
        next: (isValid) => {
          if (!isValid) {
            this.clearAuthData();
          }
        },
        error: () => {
          this.clearAuthData();
        }
      });
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        if (response.success) {
          this.setAuthData(response.data.token, response.data.user);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  register(email: string, password: string, fullName: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/auth/register`, {
      email,
      password,
      fullName
    }).pipe(
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<any> {
    const token = this.getToken();
    
    if (!token) {
      this.clearAuthData();
      return new Observable(observer => {
        observer.next({ success: true });
        observer.complete();
      });
    }

    return this.http.post(`${this.baseUrl}/auth/logout`, {}).pipe(
      tap(() => {
        this.clearAuthData();
      }),
      catchError(error => {
        // Clear auth data even if logout request fails
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  verifyToken(): Observable<boolean> {
    const token = this.getToken();
    
    if (!token) {
      return new Observable<boolean>(observer => {
        observer.next(false);
        observer.complete();
      });
    }

    return this.http.get<any>(`${this.baseUrl}/auth/me`).pipe(
      map((response: any): boolean => {
        if (response.success && response.data.user) {
          // Update user data if needed
          this.currentUserSubject.next(response.data.user);
          return true;
        }
        return false;
      }),
      catchError((): Observable<boolean> => {
        return new Observable<boolean>(observer => {
          observer.next(false);
          observer.complete();
        });
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    }).pipe(
      catchError(error => {
        console.error('Change password error:', error);
        return throwError(() => error);
      })
    );
  }

  private setAuthData(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'super_admin';
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role || user?.role === 'super_admin';
  }
}