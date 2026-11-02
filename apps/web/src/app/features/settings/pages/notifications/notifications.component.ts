import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-page-wrapper">
      <header class="settings-identity-header">
        <div class="identity-left">
          <div
            class="identity-avatar-box"
            style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%)"
            aria-hidden="true"
          >
            <span class="material-symbols-rounded">notifications</span>
          </div>
          <div class="identity-titles">
            <h1>Notificações & Alertas</h1>
            <p>Escolha como e quando você deseja receber avisos de fila de alçadas, SLA e auditoria.</p>
          </div>
        </div>
      </header>

      <nav class="settings-tabs-nav" aria-label="Abas de notificações">
        <button
          type="button"
          class="settings-tab-btn"
          [class.active]="activeTab() === 'channels'"
          (click)="activeTab.set('channels')"
        >
          <span>Canais de Alerta</span>
        </button>
        <button
          type="button"
          class="settings-tab-btn"
          [class.active]="activeTab() === 'digest'"
          (click)="activeTab.set('digest')"
        >
          <span>Resumos por E-mail</span>
        </button>
      </nav>

      <section class="settings-section-block">
        <div class="section-header-bar">
          <div class="section-title-group">
            <h2>Preferências de Notificação por Evento</h2>
            <p>Ative ou desative o disparo automático em cada canal de comunicação.</p>
          </div>
        </div>

        @for (item of settingsService.notifications(); track item.id) {
          <div class="settings-field-row">
            <div class="field-meta">
              <span class="field-label-title">{{ item.title }}</span>
              <p class="field-description">{{ item.description }}</p>
            </div>
            <div class="field-control channels-toggles">
              <label class="settings-switch">
                <input
                  type="checkbox"
                  [checked]="item.emailEnabled"
                  (change)="settingsService.toggleNotification(item.id, 'emailEnabled')"
                />
                <span class="switch-track"></span>
                <span class="switch-label">E-mail</span>
              </label>

              <label class="settings-switch">
                <input
                  type="checkbox"
                  [checked]="item.pushEnabled"
                  (change)="settingsService.toggleNotification(item.id, 'pushEnabled')"
                />
                <span class="switch-track"></span>
                <span class="switch-label">Push / Web</span>
              </label>

              <label class="settings-switch">
                <input
                  type="checkbox"
                  [checked]="item.whatsappEnabled"
                  (change)="settingsService.toggleNotification(item.id, 'whatsappEnabled')"
                />
                <span class="switch-track"></span>
                <span class="switch-label">WhatsApp</span>
              </label>
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: [
    `
      @use '../../shared/settings-form';

      .channels-toggles {
        flex-direction: row !important;
        align-items: center;
        gap: 1.75rem !important;
        flex-wrap: wrap;
        padding-top: 0.25rem;
      }
    `,
  ],
})
export class NotificationsComponent {
  readonly settingsService = inject(SettingsService);
  readonly activeTab = signal<'channels' | 'digest'>('channels');
}
