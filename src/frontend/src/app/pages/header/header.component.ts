import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type PageView = 'inicio' | 'nosotros' | 'catalog' | 'detail' | 'auth' | 'request' | 'requests';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  @Input() activePage: PageView = 'inicio';
  @Input() userName = '';
  @Input() isLoggedIn = false;
  @Output() catalogClicked = new EventEmitter<void>();
  @Output() requestsClicked = new EventEmitter<void>();
  @Output() inicioClicked = new EventEmitter<void>();
  @Output() nosotrosClicked = new EventEmitter<void>();
  @Output() loginClicked = new EventEmitter<void>();
  @Output() registerClicked = new EventEmitter<void>();
  @Output() logoutClicked = new EventEmitter<void>();

  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}