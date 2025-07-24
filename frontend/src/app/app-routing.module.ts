import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'scraping',
    loadChildren: () => import('./features/scraping/scraping.module').then(m => m.ScrapingModule)
  },
  {
    path: 'analysis',
    loadChildren: () => import('./features/analysis/analysis.module').then(m => m.AnalysisModule)
  },
  {
    path: 'export',
    loadChildren: () => import('./features/export/export.module').then(m => m.ExportModule)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
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