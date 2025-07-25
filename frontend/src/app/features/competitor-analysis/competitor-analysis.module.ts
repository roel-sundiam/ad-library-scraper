import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@shared/shared.module';

import { CompetitorAnalysisComponent } from './components/competitor-analysis.component';
import { ProgressDashboardComponent } from './components/progress-dashboard.component';
import { ResultsDisplayComponent } from './components/results-display.component';
import { AiChatComponent } from './components/ai-chat.component';

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
  }
];

@NgModule({
  declarations: [
    CompetitorAnalysisComponent,
    ProgressDashboardComponent,
    ResultsDisplayComponent,
    AiChatComponent
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