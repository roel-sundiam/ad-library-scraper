import { Component } from '@angular/core';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'ads-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Scraping', route: '/scraping', icon: 'search' },
    { label: 'Analysis', route: '/analysis', icon: 'analytics' },
    { label: 'Export', route: '/export', icon: 'download' }
  ];
}