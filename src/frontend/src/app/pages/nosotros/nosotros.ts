import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';


@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [],
  templateUrl: './nosotros.html',
  styleUrl: './nosotros.css',
})
export class Nosotros {
  @Output() catalogClicked = new EventEmitter<void>();
}
