import { Routes } from '@angular/router';
import { SettingsShellComponent } from './components/settings-shell/settings-shell.component';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: SettingsShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'perfil' },
      {
        path: 'perfil',
        title: 'Perfil · Alçadas',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'organizacao',
        title: 'Organização & Empresa · Alçadas',
        loadComponent: () =>
          import('./pages/organization/organization.component').then(
            (m) => m.OrganizationComponent,
          ),
      },
      {
        path: 'empresa',
        pathMatch: 'full',
        redirectTo: 'organizacao',
      },
      {
        path: 'seguranca',
        title: 'Segurança · Alçadas',
        loadComponent: () =>
          import('./pages/security/security.component').then(
            (m) => m.SecurityComponent,
          ),
      },
      {
        path: 'notificacoes',
        title: 'Notificações · Alçadas',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: 'integracoes',
        title: 'Integrações & API · Alçadas',
        loadComponent: () =>
          import('./pages/integrations/integrations.component').then(
            (m) => m.IntegrationsComponent,
          ),
      },
    ],
  },
];
