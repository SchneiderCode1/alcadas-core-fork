import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
  // Rotas públicas
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'verificarCodigo',
    loadComponent: () =>
      import('./features/auth/pages/verificar-codigo/verificar-codigo').then((m) => m.VerificarCodigo),
  },
  {
    path: 'novaSenha',
    loadComponent: () =>
      import('./features/auth/pages/nova-senha/nova-senha').then((m) => m.NovaSenha),
  },
  {
    // Rotas internas: só com sessão do Firebase Auth (CA-09.2)
    path: '',
    canActivateChild: [authGuard],
    children: [
      {
        path: 'configuracoes',
        loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'aprovacoes',
        loadComponent: () =>
          import('./features/approvals/approvals.component').then((m) => m.ApprovalsComponent),
      },
      {
        path: 'solicitacoes',
        loadComponent: () =>
          import('./features/requests/requests.component').then((m) => m.RequestsComponent),
      },
      {
        path: 'solicitacoes/nova',
        loadComponent: () =>
          import('./features/requests/pages/create-request/create-request.component').then(
            (m) => m.CreateRequestComponent,
          ),
      },
      {
        path: 'alcadas',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'minhas-alcadas',
          },
          {
            path: 'minhas-alcadas',
            loadComponent: () =>
              import('./features/limits/pages/my-limits/my-limits.component').then((m) => m.MyLimitsComponent),
          },
          {
            path: 'regras',
            loadComponent: () =>
              import('./features/limits/pages/rules-catalog/rules-catalog.component').then(
                (m) => m.RulesCatalogComponent,
              ),
          },
          {
            path: 'editor/:id',
            loadComponent: () => import('./features/limits/limits.component').then((m) => m.LimitsComponent),
          },
          {
            path: 'novo',
            loadComponent: () => import('./features/limits/limits.component').then((m) => m.LimitsComponent),
          },
        ],
      },
      {
        path: 'auditoria',
        loadComponent: () => import('./features/audit/audit.component').then((m) => m.AuditComponent),
      },
      {
        path: 'riscos',
        loadComponent: () => import('./features/risks/risks.component').then((m) => m.RisksComponent),
      },
      {
        path: 'delegacoes',
        loadComponent: () =>
          import('./features/delegations/delegations.component').then((m) => m.DelegationsComponent),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
