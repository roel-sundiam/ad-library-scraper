import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard, SuperAdminGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'scraping',
    loadChildren: () => import('./features/scraping/scraping.module').then(m => m.ScrapingModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'analysis',
    loadChildren: () => import('./features/analysis/analysis.module').then(m => m.AnalysisModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'export',
    loadChildren: () => import('./features/export/export.module').then(m => m.ExportModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'competitor-analysis',
    loadChildren: () => import('./features/competitor-analysis/competitor-analysis.module').then(m => m.CompetitorAnalysisModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [SuperAdminGuard]
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, // Set to true for debugging
    scrollPositionRestoration: 'top'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }