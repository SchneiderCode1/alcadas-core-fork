import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

export interface SettingsNavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
  externalHint?: boolean;
}

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './settings-shell.component.html',
  styleUrl: './settings-shell.component.scss',
})
export class SettingsShellComponent {
  readonly isNavCollapsed = signal(false);

  readonly personalItems: SettingsNavItem[] = [
    { path: 'perfil', label: 'Perfil', icon: 'account_circle' },
    { path: 'seguranca', label: 'Segurança', icon: 'lock' },
    { path: 'notificacoes', label: 'Notificações & Alertas', icon: 'notifications' },
  ];

  readonly workspaceItems: SettingsNavItem[] = [
    {
      path: 'organizacao',
      label: 'Organização',
      icon: 'domain',
      badge: 'Admin',
    },
    {
      path: 'integracoes',
      label: 'Integrações & API',
      icon: 'hub',
      externalHint: true,
    },
  ];

  toggleSubnav(): void {
    this.isNavCollapsed.update((v) => !v);
  }
}
