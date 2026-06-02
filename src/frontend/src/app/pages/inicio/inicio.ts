import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ViewChild } from '@angular/core';
import { ModelItem } from '../data/model';
import { BuscadorInteligente } from '../shared/components/buscador-inteligente/buscador-inteligente';

@Component({
  selector: 'app-inicio',
  standalone: true,

  imports: [
    CommonModule,
    BuscadorInteligente
  ],

  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css']
})

export class Inicio {
  
@Output() requestAccess = new EventEmitter<'personalizar'>();
  @Output() registerClicked = new EventEmitter<void>();
@Output() modelSelected = new EventEmitter<ModelItem>();

  @Output() catalogClicked = new EventEmitter<void>();

  @ViewChild(BuscadorInteligente)
buscador!: BuscadorInteligente;

@Input() isLoggedIn = false;

mostrarAvisoCuenta(): void {
  alert('Ya has iniciado sesión. No es necesario registrarte nuevamente.');
}

buscarTag(tag: string): void {
  this.buscador.setBusqueda(tag);
}

}
