import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-combobox-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './combobox-input.component.html',
  styleUrl: './combobox-input.component.css',
})
export class ComboboxInputComponent implements OnInit {

  @Input() label = '';
  @Input() required = false;
  @Input() placeholder = 'Buscar o escribir...';
  @Input() initialOptions: string[] = [];
  @Input() value = '';

  @Output() valueChange = new EventEmitter<string>();

  options: string[] = [];
  inputText = '';
  showDropdown = false;

  ngOnInit(): void {
    this.options = [...this.initialOptions];
    this.inputText = this.value;
  }

  get filteredOptions(): string[] {
    const q = this.inputText.trim().toLowerCase();
    if (!q) return this.options;
    return this.options.filter(o => o.toLowerCase().includes(q));
  }

  get showCrear(): boolean {
    const t = this.inputText.trim().toLowerCase();
    if (!t) return false;
    return !this.options.some(o => o.toLowerCase() === t);
  }

  onInput(): void {
    this.showDropdown = true;
    this.valueChange.emit(this.inputText);
  }

  onFocus(): void {
    this.showDropdown = true;
  }

  onBlur(): void {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  selectOption(option: string): void {
    this.inputText = option;
    this.valueChange.emit(option);
    this.showDropdown = false;
  }

  crearNuevo(): void {
    const trimmed = this.inputText.trim();
    if (!trimmed) return;
    if (!this.options.some(o => o.toLowerCase() === trimmed.toLowerCase())) {
      this.options.push(trimmed);
    }
    this.selectOption(trimmed);
  }
}
