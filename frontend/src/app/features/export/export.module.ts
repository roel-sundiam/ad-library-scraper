import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@shared/shared.module';

import { ExportComponent } from './components/export.component';

const routes: Routes = [
  {
    path: '',
    component: ExportComponent
  }
];

@NgModule({
  declarations: [
    ExportComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class ExportModule { }