import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@shared/shared.module';

import { AnalysisComponent } from './components/analysis.component';

const routes: Routes = [
  {
    path: '',
    component: AnalysisComponent
  }
];

@NgModule({
  declarations: [
    AnalysisComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class AnalysisModule { }