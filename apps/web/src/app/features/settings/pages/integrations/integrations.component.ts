import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page-wrapper">
      <header class="settings-identity-header">
        <div class="identity-left">
          <div
            class="identity-avatar-box"
            style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
            aria-hidden="true"
          >
            <span class="material-symbols-rounded">hub</span>
          </div>
          <div class="identity-titles">
            <h1>Integrações & API</h1>
            <p>Conecte seu ERP, mensageria corporativa e gerencie chaves de acesso programático.</p>
          </div>
        </div>
      </header>

      <nav class="settings-tabs-nav" aria-label="Abas de integrações">
        <button
          type="button"
          class="settings-tab-btn"
          [class.active]="activeTab() === 'connectors'"
          (click)="activeTab.set('connectors')"
        >
          <span>Conectores Corporativos</span>
          <span class="tab-badge">{{ settingsService.integrations().length }}</span>
        </button>

        <button
          type="button"
          class="settings-tab-btn"
          [class.active]="activeTab() === 'api'"
          (click)="activeTab.set('api')"
        >
          <span>Chaves de API & Webhooks</span>
          <span class="tab-badge">{{ settingsService.apiKeys().length }}</span>
        </button>
      </nav>

      @if (activeTab() === 'connectors') {
        <section class="settings-section-block">
          <div class="section-header-bar">
            <div class="section-title-group">
              <h2>Ecossistema Conectado</h2>
              <p>Integrações nativas homologadas com o motor de alçadas.</p>
            </div>
          </div>

          @for (item of settingsService.integrations(); track item.id) {
            <div class="settings-field-row">
              <div class="field-meta">
                <span class="field-label-title">
                  {{ item.name }}
                  <span
                    class="settings-pill"
                    [class.success]="item.connected"
                    [class.neutral]="!item.connected"
                  >
                    {{ item.connected ? 'Conectado' : 'Disponível' }}
                  </span>
                </span>
                <p class="field-description">{{ item.description }}</p>
              </div>
              <div class="field-control connector-right">
                <span class="sync-info">
                  {{ item.lastSync ? 'Sincronização: ' + item.lastSync : 'Não configurado' }}
                </span>
                <button
                  type="button"
                  class="btn-settings"
                  [class.primary]="!item.connected"
                  (click)="settingsService.toggleIntegration(item.id)"
                >
                  {{ item.connected ? 'Desconectar' : 'Conectar' }}
                </button>
              </div>
            </div>
          }
        </section>
      }

      @if (activeTab() === 'api') {
        <section class="settings-section-block">
          <div class="section-header-bar">
            <div class="section-title-group">
              <h2>Chaves de API (REST / Webhooks)</h2>
              <p>Autentique chamadas externas de ERPs e sistemas internos na API do Alçadas.</p>
            </div>
          </div>

          <div class="settings-field-row">
            <div class="field-meta">
              <span class="field-label-title">Gerar nova chave de API</span>
              <p class="field-description">
                Crie um token de acesso com escopo de leitura/escrita.
              </p>
            </div>
            <div class="field-control">
              <div class="create-key-inline">
                <input
                  type="text"
                  class="settings-input"
                  placeholder="Nome da chave (ex: Integração ERP Totvs)..."
                  [ngModel]="newKeyName()"
                  (ngModelChange)="newKeyName.set($event)"
                />
                <button type="button" class="btn-settings primary" (click)="generateKey()">
                  <span class="material-symbols-rounded">add</span>
                  <span>Gerar Chave</span>
                </button>
              </div>
            </div>
          </div>

          @for (key of settingsService.apiKeys(); track key.id) {
            <div class="settings-field-row">
              <div class="field-meta">
                <span class="field-label-title">
                  {{ key.name }}
                  <span
                    class="settings-pill"
                    [class.primary]="key.environment === 'production'"
                  >
                    {{ key.environment }}
                  </span>
                </span>
                <p class="field-description">
                  Criada em {{ key.createdAt }} · Último uso: {{ key.lastUsedAt }}
                </p>
              </div>
              <div class="field-control connector-right">
                <code class="api-prefix">{{ key.prefix }}</code>
                <button
                  type="button"
                  class="btn-settings danger"
                  (click)="settingsService.revokeApiKey(key.id)"
                >
                  Revogar
                </button>
              </div>
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      @use '../../shared/settings-form';

      .connector-right {
        flex-direction: row !important;
        align-items: center;
        justify-content: space-between;
        gap: 1rem !important;
        flex-wrap: wrap;
      }

      .sync-info {
        font-size: 0.8125rem;
        color: #64748b;
      }

      .create-key-inline {
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }

      .api-prefix {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.8125rem;
        padding: 0.35rem 0.65rem;
        border-radius: 8px;
        background: #f1f5f9;
        color: #0f172a;
        border: 1px solid #e2e8f0;
      }
    `,
  ],
})
export class IntegrationsComponent {
  readonly settingsService = inject(SettingsService);
  readonly activeTab = signal<'connectors' | 'api'>('connectors');
  readonly newKeyName = signal('');

  generateKey(): void {
    const name = this.newKeyName().trim();
    if (!name) return;
    this.settingsService.createApiKey(name, 'production');
    this.newKeyName.set('');
  }
}
