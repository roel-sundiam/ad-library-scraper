# Angular Frontend for Ad Library Scraper

## Overview

This document outlines the Angular frontend implementation for the Ad Library Scraper + Multi-Model AI Analysis API. The Angular application provides a modern, responsive web interface for managing scraping jobs, analyzing ads, and visualizing competitive intelligence data.

## Architecture

### Full-Stack Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │ Dashboard   │ │ Scraping    │ │ Analysis & Reports      ││
│  │ Component   │ │ Components  │ │ Components              ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           Shared Services & State Management            ││
│  │  • API Service  • Auth Service  • State Management     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                                 │ HTTP/WebSocket
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js API Backend                      │
│  • Express Server  • Database  • AI Models  • Scrapers    │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

### Angular Application Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                    # Core module (singletons)
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── websocket.service.ts
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   └── error.interceptor.ts
│   │   │   └── core.module.ts
│   │   │
│   │   ├── shared/                  # Shared components & utilities
│   │   │   ├── components/
│   │   │   │   ├── loading/
│   │   │   │   ├── notification/
│   │   │   │   └── data-table/
│   │   │   ├── pipes/
│   │   │   │   ├── currency-range.pipe.ts
│   │   │   │   └── date-ago.pipe.ts
│   │   │   ├── models/
│   │   │   │   ├── ad.model.ts
│   │   │   │   ├── analysis.model.ts
│   │   │   │   └── scraping-job.model.ts
│   │   │   └── shared.module.ts
│   │   │
│   │   ├── features/                # Feature modules
│   │   │   ├── dashboard/
│   │   │   │   ├── components/
│   │   │   │   ├── services/
│   │   │   │   └── dashboard.module.ts
│   │   │   │
│   │   │   ├── scraping/
│   │   │   │   ├── components/
│   │   │   │   │   ├── scrape-form/
│   │   │   │   │   ├── job-status/
│   │   │   │   │   └── results-viewer/
│   │   │   │   ├── services/
│   │   │   │   │   └── scraping.service.ts
│   │   │   │   └── scraping.module.ts
│   │   │   │
│   │   │   ├── analysis/
│   │   │   │   ├── components/
│   │   │   │   │   ├── analysis-form/
│   │   │   │   │   ├── model-selector/
│   │   │   │   │   ├── results-dashboard/
│   │   │   │   │   └── competitive-intel/
│   │   │   │   ├── services/
│   │   │   │   │   └── analysis.service.ts
│   │   │   │   └── analysis.module.ts
│   │   │   │
│   │   │   └── export/
│   │   │       ├── components/
│   │   │       │   ├── export-form/
│   │   │       │   └── download-manager/
│   │   │       ├── services/
│   │   │       │   └── export.service.ts
│   │   │       └── export.module.ts
│   │   │
│   │   ├── layout/                  # Layout components
│   │   │   ├── header/
│   │   │   ├── sidebar/
│   │   │   ├── footer/
│   │   │   └── layout.module.ts
│   │   │
│   │   ├── app-routing.module.ts
│   │   ├── app.component.ts
│   │   └── app.module.ts
│   │
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── styles/
│   │       ├── variables.scss
│   │       ├── mixins.scss
│   │       └── themes/
│   │
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   │
│   ├── styles.scss
│   ├── index.html
│   └── main.ts
│
├── angular.json
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## Technology Stack

### Core Technologies
- **Angular 17+**: Latest Angular with standalone components
- **TypeScript**: Strong typing and modern JavaScript features
- **RxJS**: Reactive programming for API calls and state management
- **Angular Material**: UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js/D3.js**: Data visualization
- **Socket.io Client**: Real-time updates

### Development Tools
- **Angular CLI**: Project scaffolding and build tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Karma/Jasmine**: Unit testing
- **Cypress**: End-to-end testing

## Key Components

### 1. Dashboard Component
```typescript
// src/app/features/dashboard/components/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardService } from '../services/dashboard.service';
import { ScrapingJob, AnalysisResult, UsageStats } from '@shared/models';

@Component({
  selector: 'ads-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  recentJobs$: Observable<ScrapingJob[]>;
  recentAnalyses$: Observable<AnalysisResult[]>;
  usageStats$: Observable<UsageStats>;
  
  constructor(private dashboardService: DashboardService) {}
  
  ngOnInit() {
    this.recentJobs$ = this.dashboardService.getRecentJobs();
    this.recentAnalyses$ = this.dashboardService.getRecentAnalyses();
    this.usageStats$ = this.dashboardService.getUsageStats();
  }
}
```

### 2. Scraping Form Component
```typescript
// src/app/features/scraping/components/scrape-form/scrape-form.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ScrapingService } from '../../services/scraping.service';
import { Platform, ScrapingRequest } from '@shared/models';

@Component({
  selector: 'ads-scrape-form',
  templateUrl: './scrape-form.component.html',
  styleUrls: ['./scrape-form.component.scss']
})
export class ScrapeFormComponent {
  @Output() jobStarted = new EventEmitter<string>();
  
  scrapeForm: FormGroup;
  platforms: Platform[] = ['facebook', 'google', 'tiktok', 'linkedin'];
  isSubmitting = false;
  
  constructor(
    private fb: FormBuilder,
    private scrapingService: ScrapingService
  ) {
    this.scrapeForm = this.fb.group({
      platform: ['facebook', Validators.required],
      query: ['', Validators.required],
      limit: [100, [Validators.required, Validators.min(1), Validators.max(1000)]],
      region: ['US'],
      dateRange: ['30_days'],
      filters: this.fb.group({
        adType: ['all'],
        minImpressions: [null],
        languages: [[]]
      })
    });
  }
  
  async onSubmit() {
    if (this.scrapeForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      
      try {
        const request: ScrapingRequest = this.scrapeForm.value;
        const response = await this.scrapingService.startScraping(request).toPromise();
        
        this.jobStarted.emit(response.job_id);
        this.scrapeForm.reset();
      } catch (error) {
        console.error('Scraping request failed:', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }
}
```

### 3. Analysis Dashboard Component
```typescript
// src/app/features/analysis/components/results-dashboard/results-dashboard.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { AnalysisResult, AdAnalysis } from '@shared/models';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'ads-results-dashboard',
  templateUrl: './results-dashboard.component.html',
  styleUrls: ['./results-dashboard.component.scss']
})
export class ResultsDashboardComponent implements OnInit {
  @Input() analysisResult: AnalysisResult;
  
  performanceChartConfig: ChartConfiguration;
  competitiveInsights: any[];
  keyMetrics: any;
  
  ngOnInit() {
    this.setupPerformanceChart();
    this.extractCompetitiveInsights();
    this.calculateKeyMetrics();
  }
  
  private setupPerformanceChart() {
    this.performanceChartConfig = {
      type: 'radar',
      data: {
        labels: ['Hook Strength', 'CTA Effectiveness', 'Visual Appeal', 'Uniqueness', 'Performance Prediction'],
        datasets: [{
          label: 'Ad Performance Scores',
          data: this.extractPerformanceScores(),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            angleLines: { display: false },
            suggestedMin: 0,
            suggestedMax: 10
          }
        }
      }
    };
  }
  
  private extractPerformanceScores(): number[] {
    // Extract and normalize scores from analysis results
    return this.analysisResult.ad_analyses.map(analysis => 
      analysis.creative_analysis.hook_strength
    );
  }
}
```

## Services Implementation

### API Service
```typescript
// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}
  
  // Scraping endpoints
  startScraping(request: ScrapingRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/scrape`, request);
  }
  
  getScrapingJob(jobId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/scrape/${jobId}`);
  }
  
  getScrapingResults(jobId: string, params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.baseUrl}/scrape/${jobId}/results`, { params: httpParams });
  }
  
  // Analysis endpoints
  startAnalysis(request: AnalysisRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/analyze`, request);
  }
  
  getAnalysisResults(analysisId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/analyze/${analysisId}`);
  }
  
  // Export endpoints
  exportData(params: ExportRequest): Observable<any> {
    return this.http.get(`${this.baseUrl}/export`, { params });
  }
  
  // Models and usage
  getAvailableModels(): Observable<any> {
    return this.http.get(`${this.baseUrl}/models`);
  }
  
  getUsageStats(period?: string): Observable<any> {
    const params = period ? { period } : {};
    return this.http.get(`${this.baseUrl}/usage`, { params });
  }
}
```

### WebSocket Service
```typescript
// src/app/core/services/websocket.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket;
  
  constructor() {
    this.socket = io(environment.apiUrl);
  }
  
  // Join job updates room
  joinJobUpdates(jobId: string) {
    this.socket.emit('join-job-updates', jobId);
  }
  
  // Listen for job status updates
  onJobStatusUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('job-status-update', data => observer.next(data));
    });
  }
  
  // Listen for analysis completion
  onAnalysisComplete(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('analysis-complete', data => observer.next(data));
    });
  }
  
  // Leave all rooms and disconnect
  disconnect() {
    this.socket.disconnect();
  }
}
```

## UI/UX Design

### Material Design Implementation
```typescript
// src/app/shared/shared.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

// Angular Material modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // Material modules
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatChipsModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    // Material modules
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTabsModule,
    MatChipsModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule
  ]
})
export class SharedModule {}
```

### Responsive Design with Tailwind
```scss
// src/styles.scss
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

// Custom theme variables
:root {
  --primary-color: #1976d2;
  --accent-color: #ff4081;
  --warn-color: #f44336;
  --background-color: #fafafa;
  --surface-color: #ffffff;
}

// Dark theme
[data-theme="dark"] {
  --background-color: #303030;
  --surface-color: #424242;
}

// Custom component styles
.dashboard-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.metric-card {
  @apply bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow;
}

.chart-container {
  @apply bg-white rounded-lg shadow-md p-4 h-96;
}
```

## State Management

### NgRx Implementation (Optional)
```typescript
// src/app/store/scraping/scraping.actions.ts
import { createAction, props } from '@ngrx/store';
import { ScrapingJob, ScrapingRequest } from '@shared/models';

export const startScraping = createAction(
  '[Scraping] Start Scraping',
  props<{ request: ScrapingRequest }>()
);

export const startScrapingSuccess = createAction(
  '[Scraping] Start Scraping Success',
  props<{ jobId: string }>()
);

export const startScrapingFailure = createAction(
  '[Scraping] Start Scraping Failure',
  props<{ error: any }>()
);

export const updateJobStatus = createAction(
  '[Scraping] Update Job Status',
  props<{ jobId: string; status: string; progress?: any }>()
);

export const loadScrapingResults = createAction(
  '[Scraping] Load Scraping Results',
  props<{ jobId: string }>()
);
```

## Data Visualization

### Chart Components
```typescript
// src/app/shared/components/performance-chart/performance-chart.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'ads-performance-chart',
  template: `
    <div class="chart-container">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styleUrls: ['./performance-chart.component.scss']
})
export class PerformanceChartComponent implements OnInit {
  @Input() data: any[];
  @Input() chartType: 'bar' | 'line' | 'radar' | 'doughnut' = 'bar';
  
  private chart: Chart;
  
  ngOnInit() {
    this.createChart();
  }
  
  private createChart() {
    const ctx = document.getElementById('chart') as HTMLCanvasElement;
    
    const config: ChartConfiguration = {
      type: this.chartType,
      data: this.prepareChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Ad Performance Metrics'
          }
        }
      }
    };
    
    this.chart = new Chart(ctx, config);
  }
  
  private prepareChartData(): ChartData {
    // Transform input data into Chart.js format
    return {
      labels: this.data.map(item => item.label),
      datasets: [{
        label: 'Performance Score',
        data: this.data.map(item => item.value),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1
      }]
    };
  }
}
```

## Setup Instructions

### 1. Initialize Angular Project
```bash
# Navigate to project root
cd /mnt/c/Projects2/scraper

# Create Angular application
npx @angular/cli@latest new frontend --routing --style=scss --skip-git

# Navigate to frontend directory
cd frontend

# Install additional dependencies
npm install @angular/material @angular/cdk @angular/animations
npm install chart.js ng2-charts
npm install socket.io-client
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install @ngrx/store @ngrx/effects @ngrx/store-devtools
```

### 2. Configure Tailwind CSS
```bash
# Initialize Tailwind
npx tailwindcss init

# Update tailwind.config.js
```

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1976d2',
        accent: '#ff4081',
        warn: '#f44336'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### 3. Configure Angular Material
```bash
ng add @angular/material
```

### 4. Environment Configuration
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  websocketUrl: 'http://localhost:3000'
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-domain.com/api',
  websocketUrl: 'https://your-domain.com'
};
```

## Development Workflow

### 1. Development Server
```bash
# Start Angular development server
ng serve

# Start with specific port
ng serve --port 4200

# Start with proxy configuration
ng serve --proxy-config proxy.conf.json
```

### 2. Proxy Configuration
```json
// proxy.conf.json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### 3. Build for Production
```bash
# Build production version
ng build --configuration=production

# Build with specific output path
ng build --output-path=../public
```

## Testing Strategy

### Unit Testing
```typescript
// src/app/features/scraping/services/scraping.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ScrapingService } from './scraping.service';

describe('ScrapingService', () => {
  let service: ScrapingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ScrapingService]
    });
    service = TestBed.inject(ScrapingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should start scraping job', () => {
    const mockRequest = { platform: 'facebook', query: 'test' };
    const mockResponse = { job_id: 'test-123' };

    service.startScraping(mockRequest).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/scrape');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockResponse);
  });
});
```

### E2E Testing with Cypress
```typescript
// cypress/e2e/scraping-flow.cy.ts
describe('Scraping Flow', () => {
  beforeEach(() => {
    cy.visit('/scraping');
  });

  it('should start a scraping job', () => {
    // Fill scraping form
    cy.get('[data-cy=platform-select]').click();
    cy.get('[data-cy=facebook-option]').click();
    
    cy.get('[data-cy=query-input]').type('fitness supplements');
    cy.get('[data-cy=limit-input]').clear().type('50');
    
    // Submit form
    cy.get('[data-cy=start-scraping-btn]').click();
    
    // Verify job started
    cy.get('[data-cy=job-status]').should('contain', 'Job started');
    cy.url().should('include', '/scraping/job/');
  });

  it('should display scraping results', () => {
    cy.intercept('GET', '/api/scrape/*/results', { 
      fixture: 'scraping-results.json' 
    });
    
    cy.visit('/scraping/job/test-123');
    
    cy.get('[data-cy=results-table]').should('be.visible');
    cy.get('[data-cy=ad-row]').should('have.length.greaterThan', 0);
  });
});
```

## Deployment

### Docker Configuration
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build --configuration=production

FROM nginx:alpine
COPY --from=builder /app/dist/frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration
```nginx
# nginx.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://backend:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

This Angular frontend provides a comprehensive, modern interface for your Ad Library Scraper system with real-time updates, data visualization, and responsive design! 🚀

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Update project architecture to include Angular frontend", "status": "completed", "priority": "high"}, {"id": "2", "content": "Create Angular project structure and configuration", "status": "in_progress", "priority": "high"}, {"id": "3", "content": "Design Angular components for ad scraping interface", "status": "pending", "priority": "high"}, {"id": "4", "content": "Build AI analysis dashboard with Angular", "status": "pending", "priority": "medium"}, {"id": "5", "content": "Create data visualization components", "status": "pending", "priority": "medium"}, {"id": "6", "content": "Implement export functionality in Angular", "status": "pending", "priority": "medium"}, {"id": "7", "content": "Add responsive design and PWA features", "status": "pending", "priority": "low"}]