import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  input,
  output,
  signal,
  AfterViewInit,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestItem } from '../../../requests/requests.models';

export interface SignatureConfirmation {
  signatureDataUrl: string;
  comentario: string;
}

@Component({
  selector: 'app-digital-signature-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './digital-signature-modal.component.html',
  styleUrl: './digital-signature-modal.component.scss',
})
export class DigitalSignatureModalComponent implements AfterViewInit {
  @ViewChild('signatureCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly isOpen = input<boolean>(false);
  readonly request = input<RequestItem | null>(null);
  /** Nome do aprovador logado, usado como rubrica digitada inicial. */
  readonly signatario = input<string>('');

  readonly confirmed = output<SignatureConfirmation>();
  readonly closed = output<void>();

  // Estado do formulário de assinatura
  readonly isAgreed = signal<boolean>(false);
  readonly showAgreementWarning = signal<boolean>(false);
  readonly comentario = signal<string>('Aprovado nos termos da política de governança corporativa.');
  readonly hasDrawn = signal<boolean>(false);
  readonly signMode = signal<'draw' | 'type'>('draw');
  readonly typedSignature = signal<string>('');

  private isDrawing = false;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.isAgreed.set(false);
        this.showAgreementWarning.set(false);
        this.typedSignature.set(untracked(this.signatario));
        setTimeout(() => {
          this.initCanvas();
        }, 80);
      }
    });
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.closeModal();
    }
  }

  ngAfterViewInit(): void {
    if (this.isOpen()) {
      this.initCanvas();
    }
  }

  initCanvas(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#0f172a';

    // Se estiver no canvas e ainda não desenhou, desenha a rubrica pré-configurada
    if (!this.hasDrawn()) {
      this.drawPresetSignature();
    }
  }

  drawPresetSignature(): void {
    if (!this.canvasRef || !this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    this.clearCanvas();
    const rubrica = this.typedSignature().trim();
    if (!rubrica) return;

    this.ctx.save();
    this.ctx.font = 'italic 36px "Brush Script MT", "Caveat", "Dancing Script", "Segoe Script", cursive, sans-serif';
    this.ctx.fillStyle = '#0f172a';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(rubrica, canvas.width / 2, canvas.height / 2 - 4);

    // Linha elegante de rubrica embaixo
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(canvas.width / 2 - 90, canvas.height / 2 + 24);
    this.ctx.quadraticCurveTo(canvas.width / 2, canvas.height / 2 + 14, canvas.width / 2 + 100, canvas.height / 2 + 20);
    this.ctx.stroke();
    this.ctx.restore();

    this.hasDrawn.set(true);
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    this.isDrawing = true;
    const pos = this.getCanvasCoordinates(event);
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing || !this.ctx) return;
    event.preventDefault();
    const pos = this.getCanvasCoordinates(event);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.hasDrawn.set(true);
  }

  stopDrawing(): void {
    if (this.isDrawing && this.ctx) {
      this.ctx.closePath();
    }
    this.isDrawing = false;
  }

  clearCanvas(): void {
    if (!this.canvasRef || !this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasDrawn.set(false);
  }

  toggleAgreement(): void {
    this.isAgreed.update((v) => !v);
    if (this.isAgreed()) {
      this.showAgreementWarning.set(false);
    }
  }

  toggleSignMode(): void {
    const next = this.signMode() === 'draw' ? 'type' : 'draw';
    this.signMode.set(next);
    if (next === 'type') {
      this.drawPresetSignature();
    }
  }

  onTypedSignatureChange(name: string): void {
    this.typedSignature.set(name);
    this.drawPresetSignature();
  }

  confirmSignature(): void {
    if (!this.isAgreed()) {
      this.showAgreementWarning.set(true);
      return;
    }

    let signatureDataUrl = '';
    if (this.canvasRef && this.hasDrawn()) {
      signatureDataUrl = this.canvasRef.nativeElement.toDataURL('image/png');
    }

    this.confirmed.emit({
      signatureDataUrl,
      comentario: this.comentario().trim(),
    });
  }

  closeModal(): void {
    this.closed.emit();
  }

  private getCanvasCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } {
    if (!this.canvasRef) return { x: 0, y: 0 };
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }
}
