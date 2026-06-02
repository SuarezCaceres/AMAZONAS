import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  @Output() catalogClicked = new EventEmitter<void>();
  @Output() loginClicked = new EventEmitter<void>();
}
