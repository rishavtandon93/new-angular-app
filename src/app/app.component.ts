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

import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  forwardRef,
  OnInit,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
} from '@angular/forms';
import { NgStyle } from '@angular/common';

/** Parsed result from user input */
interface ParseResult {
  value: number;
  isValid: true;
}

interface ParseFailure {
  isValid: false;
}

type ParseOutcome = ParseResult | ParseFailure;

/** Strongly typed params passed in from AG Grid */
export interface NumberCellEditorParams {
  value: number | null;
  styleClass?: string;
  placeholder?: string;
}

/** Change callback signature — no `any` */
type OnChangeFn = (value: number | null) => void;
type OnTouchedFn = () => void;

@Component({
  selector: 'app-number-input',
  templateUrl: './number-input.component.html',
  styleUrls: ['./number-input.component.scss'],
  standalone: true,
  imports: [NgStyle, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumberInputComponent),
      multi: true,
    },
  ],
})
export class NumberInputComponent implements ControlValueAccessor, OnInit {
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  /** Optional CSS class applied to the <input> element */
  @Input() styleClass: string = '';

  /** Optional inline styles applied to the <input> element */
  @Input() inputStyle: Record<string, string> = {};

  /** Placeholder text */
  @Input() placeholder: string = '0';

  /** The formatted string shown in the input */
  displayValue: string = '';

  /** The actual numeric value held internally */
  private numericValue: number | null = null;

  private onChange: OnChangeFn = (_value: number | null) => {};
  private onTouched: OnTouchedFn = () => {};

  ngOnInit(): void {}

  // ── ControlValueAccessor ────────────────────────────────────────────────────

  writeValue(value: number | null): void {
    this.numericValue = value;
    this.displayValue = value !== null ? this.formatWithCommas(value) : '';
  }

  registerOnChange(fn: OnChangeFn): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: OnTouchedFn): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    const el = this.inputEl?.nativeElement;
    if (el) {
      el.disabled = isDisabled;
    }
  }

  // ── Event Handlers ──────────────────────────────────────────────────────────

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw: string = input.value;

    // While user is mid-typing a suffix (e.g. "1k"), don't reformat yet
    if (this.hasSuffix(raw)) {
      this.displayValue = raw;
      const outcome = this.parseInput(raw);
      if (outcome.isValid) {
        this.numericValue = outcome.value;
        this.onChange(outcome.value);
      }
      return;
    }

    const outcome = this.parseInput(raw);

    if (raw === '') {
      this.numericValue = null;
      this.displayValue = '';
      this.onChange(null);
      return;
    }

    if (!outcome.isValid) {
      // Revert display to last known good value
      input.value = this.displayValue;
      return;
    }

    this.numericValue = outcome.value;
    this.onChange(outcome.value);

    const formatted = this.formatWithCommas(outcome.value);
    this.displayValue = formatted;

    // Restore cursor after Angular re-renders
    const cursorPos: number = input.selectionStart ?? formatted.length;
    setTimeout(() => {
      input.value = formatted;
      input.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }

  onBlur(): void {
    this.onTouched();
    if (this.numericValue !== null) {
      this.displayValue = this.formatWithCommas(this.numericValue);
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const navigationKeys: string[] = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
      'Enter',
    ];

    if (navigationKeys.includes(event.key)) {
      return;
    }

    // Allow Ctrl/Cmd + A, C, V, X
    if (
      (event.ctrlKey || event.metaKey) &&
      ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())
    ) {
      return;
    }

    // Only allow digits, k, m (commas are display-only, not typed)
    const allowedPattern = /^[0-9km]$/i;
    if (!allowedPattern.test(event.key)) {
      event.preventDefault();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted: string = event.clipboardData?.getData('text') ?? '';
    const outcome = this.parseInput(pasted.trim());

    if (outcome.isValid) {
      this.numericValue = outcome.value;
      this.displayValue = this.formatWithCommas(outcome.value);
      this.onChange(outcome.value);
    }
  }

  // ── Public API (used by AG Grid adapter) ────────────────────────────────────

  getValue(): number | null {
    return this.numericValue;
  }

  focusInput(): void {
    this.inputEl?.nativeElement.focus();
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Parses raw user input into a numeric value.
   * Supports: plain numbers, numbers with commas, `Nk` (thousands), `Nm` (millions).
   */
  private parseInput(raw: string): ParseOutcome {
    const cleaned: string = raw.replace(/,/g, '').trim().toLowerCase();

    if (cleaned === '') {
      return { isValid: false };
    }

    // Match e.g. "1k", "25.5k"
    const kMatch: RegExpMatchArray | null = cleaned.match(/^(\d+(\.\d+)?)k$/);
    if (kMatch !== null) {
      const multiplied: number = parseFloat(kMatch[1]) * 1_000;
      return multiplied >= 0
        ? { isValid: true, value: multiplied }
        : { isValid: false };
    }

    // Match e.g. "2m", "1.5m"
    const mMatch: RegExpMatchArray | null = cleaned.match(/^(\d+(\.\d+)?)m$/);
    if (mMatch !== null) {
      const multiplied: number = parseFloat(mMatch[1]) * 1_000_000;
      return multiplied >= 0
        ? { isValid: true, value: multiplied }
        : { isValid: false };
    }

    // Plain number
    const num: number = parseFloat(cleaned);
    if (!isNaN(num) && isFinite(num) && num >= 0) {
      return { isValid: true, value: num };
    }

    return { isValid: false };
  }

  /** Returns true if the raw string ends with a multiplier suffix (k/m) */
  private hasSuffix(raw: string): boolean {
    return /[km]$/i.test(raw.replace(/,/g, ''));
  }

  /** Formats a number with locale-aware comma separators */
  private formatWithCommas(value: number): string {
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 10,
      useGrouping: true,
    });
  }
}
