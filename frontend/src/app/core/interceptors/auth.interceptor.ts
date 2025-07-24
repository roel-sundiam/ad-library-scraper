import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Add auth headers if needed (implement authentication later)
    // const authToken = localStorage.getItem('authToken');
    // if (authToken) {
    //   request = request.clone({
    //     setHeaders: {
    //       Authorization: `Bearer ${authToken}`
    //     }
    //   });
    // }
    
    return next.handle(request);
  }
}