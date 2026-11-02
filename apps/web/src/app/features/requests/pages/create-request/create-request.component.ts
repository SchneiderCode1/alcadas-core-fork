import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JUSTIFICATIVA_MINIMA_ACIMA_DA_BASE } from '@alcadas-core/models';
import { mensagemDeErroDaApi } from '../../../../core/http/api-error';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { validarNovaSolicitacao } from '../../request-form.validation';
import { fluxoDaAlcada } from '../../requests.mapper';
import { WorkflowDestination } from '../../requests.models';
import { RequestsService } from '../../services/requests.service';

/** Página de nova solicitação (US-02) — envia para `POST /api/solicitacoes`. */
@Component({
  selector: 'app-create-request',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent],
  templateUrl: './create-request.component.html',
  styleUrl: './create-request.component.scss',
})
export class CreateRequestComponent implements OnInit {
  protected readonly requestsService = inject(RequestsService);
  private readonly router = inject(Router);

  readonly formCategoria = signal<string>(this.requestsService.categories[0]?.id ?? '');
  readonly formCentroCustoId = signal<string>('');
  readonly formValor = signal<number | null>(null);
  readonly formJustificativa = signal<string>('');
  readonly formErrors = signal<Record<string, string>>({});
  readonly isSubmitting = signal<boolean>(false);
  readonly justificativaMinima = JUSTIFICATIVA_MINIMA_ACIMA_DA_BASE;

  /** A justificativa longa só é exigida acima do limite base da categoria (RN02). */
  readonly exigeJustificativaLonga = computed(() => {
    const categoria = this.requestsService.categories.find((c) => c.id === this.formCategoria());
    return categoria !== undefined && (this.formValor() ?? 0) > categoria.limiteBase;
  });

  /** Alçada que vai decidir, calculada com os tetos reais do tenant (RN01). */
  readonly suggestedWorkflow = computed<WorkflowDestination>(() =>
    fluxoDaAlcada(this.formValor() ?? 0, 'PENDENTE', this.requestsService.tiers()),
  );

  constructor() {
    // Seleciona o primeiro centro de custo assim que eles chegam da API.
    effect(() => {
      const primeiro = this.requestsService.costCenters()[0];
      if (primeiro && !untracked(this.formCentroCustoId)) {
        this.formCentroCustoId.set(primeiro.id);
      }
    });
  }

  ngOnInit(): void {
    this.requestsService.ensureLoaded();
  }

  goBack(): void {
    void this.router.navigate(['/solicitacoes']);
  }

  submitNewRequest(): void {
    const dados = {
      centroCustoId: this.formCentroCustoId(),
      categoria: this.formCategoria(),
      valor: this.formValor(),
      justificativa: this.formJustificativa(),
    };
    const erros = validarNovaSolicitacao(dados);
    this.formErrors.set(erros);
    if (Object.keys(erros).length > 0) {
      return;
    }

    this.isSubmitting.set(true);
    this.requestsService
      .create({ ...dados, valor: dados.valor ?? 0, justificativa: dados.justificativa.trim() })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          void this.router.navigate(['/solicitacoes'], { queryParams: { criada: 'true' } });
        },
        error: (erro: unknown) => {
          this.isSubmitting.set(false);
          this.formErrors.set({ geral: mensagemDeErroDaApi(erro) });
        },
      });
  }
}
