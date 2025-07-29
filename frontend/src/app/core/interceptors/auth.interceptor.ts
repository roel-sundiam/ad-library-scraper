import { Injectable } from '@angular/core';
import { 
  HttpRequest, 
  HttpHandler, 
  HttpEvent, 
  HttpInterceptor,
  HttpErrorResponse 
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Add auth token to requests if available
    const authToken = this.authService.getToken();
    
    if (authToken) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`
        }
      });
    }
    
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle authentication errors
        if (error.status === 401) {
          // Token is invalid or expired
          this.authService.logout().subscribe({
            complete: () => {
              this.router.navigate(['/auth/login']);
            }
          });
        } else if (error.status === 403) {
          // User doesn't have permission
          if (error.error?.error?.code === 'ACCOUNT_NOT_APPROVED') {
            // User account is not approved yet
            this.router.navigate(['/auth/login']);
          } else {
            // Other permission errors - redirect to dashboard
            this.router.navigate(['/dashboard']);
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}