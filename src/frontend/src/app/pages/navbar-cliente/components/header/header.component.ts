import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

type PageView = 'inicio' | 'nosotros' | 'catalog' | 'detail' | 'auth' | 'request' | 'requests' | 'categories' | 'vendedor' | 'reset-password' | 'chat';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {

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
  @Output() categoriesClicked = new EventEmitter<void>();

  menuOpen = false;

  ngOnInit(): void {}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}
