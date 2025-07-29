import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@shared/shared.module';
import { SuperAdminGuard } from '../../core/guards/super-admin.guard';

import { CompetitorAnalysisComponent } from './components/competitor-analysis.component';
import { ProgressDashboardComponent } from './components/progress-dashboard.component';
import { ResultsDisplayComponent } from './components/results-display.component';
import { AiChatComponent } from './components/ai-chat.component';
import { FacebookAdsDashboardComponent } from './components/facebook-ads-dashboard.component';
import { FacebookTokenConfigComponent } from './components/facebook-token-config.component';

const routes: Routes = [
  {
    path: '',
    component: CompetitorAnalysisComponent
  },
  {
    path: 'progress/:workflowId',
    component: ProgressDashboardComponent
  },
  {
    path: 'results/:workflowId',
    component: ResultsDisplayComponent
  },
  {
    path: 'facebook-dashboard/:datasetId',
    component: FacebookAdsDashboardComponent,
    data: { title: 'Facebook Ads Analysis Results' }
  },
  {
    path: 'facebook-config',
    component: FacebookTokenConfigComponent,
    canActivate: [SuperAdminGuard],
    data: { title: 'Facebook API Configuration' }
  }
];

@NgModule({
  declarations: [
    CompetitorAnalysisComponent,
    ProgressDashboardComponent,
    ResultsDisplayComponent,
    AiChatComponent,
    FacebookAdsDashboardComponent,
    FacebookTokenConfigComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class CompetitorAnalysisModule { }