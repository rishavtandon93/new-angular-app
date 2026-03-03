import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'my-angular-app';
}

writeValue(value: number | string | null | undefined): void {
  if (value === null || value === undefined || value === '') {
    this.numericValue = null;
    this.displayValue = '';
    return;
  }

  const coerced: number =
    typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(coerced) || !isFinite(coerced) || coerced < 0) {
    this.numericValue = null;
    this.displayValue = '';
    return;
  }

  this.numericValue = coerced;
  this.displayValue = this.formatWithCommas(coerced); // ← always formats
}
