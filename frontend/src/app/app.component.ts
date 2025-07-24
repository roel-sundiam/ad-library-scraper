import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'ads-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Ad Library Scraper';
  
  constructor(private router: Router) {}
  
  ngOnInit() {
    // Track route changes for analytics or other purposes
    this.router.events
      .pipe(filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // You can add analytics tracking here
        console.log('Route changed to:', event.url);
      });
  }
}