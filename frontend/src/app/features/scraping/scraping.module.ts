import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@shared/shared.module';

import { ScrapingComponent } from './components/scraping.component';

const routes: Routes = [
  {
    path: '',
    component: ScrapingComponent
  }
];

@NgModule({
  declarations: [
    ScrapingComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class ScrapingModule { }