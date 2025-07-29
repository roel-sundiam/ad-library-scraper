import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AnalyticsService } from '@core/services/analytics.service';

@Component({
  selector: 'ads-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Ad Library Scraper';
  
  constructor(
    private router: Router,
    private analyticsService: AnalyticsService
  ) {}
  
  ngOnInit() {
    // Analytics service will automatically track route changes
    // The router tracking is already initialized in the service constructor
    console.log('App component initialized with analytics tracking');
  }
}