import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SubMenuItem {
  id: string;
  route: string;
  label: string;
  icon?: string;
  badge?: string | number | null;
  badgeColor?: string;
}

export interface MenuItem {
  id: string;
  route: string;
  label: string;
  icon: string;
  badge?: string | number | null;
  badgeColor?: string;
  hasSubmenu?: boolean;
  subItems?: SubMenuItem[];
}

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  color: string;
  isPinned: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule,RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isCollapsed = signal(false);
  readonly searchQuery = signal('');

  // Sincroniza a aba ativa diretamente com a URL da rota
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly activeItem = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/aprovacoes')) return 'aprovacoes';
    if (url.includes('/solicitacoes')) return 'solicitacoes';
    if (url.includes('/alcadas/regras')) return 'minhas-regras';
    if (url.includes('/alcadas')) return 'meus-fluxos';
    if (url.includes('/auditoria')) return 'auditoria';
    if (url.includes('/riscos')) return 'riscos';
    if (url.includes('/delegacoes')) return 'delegacoes';
    if (url.includes('/configuracoes/organizacao') || url.includes('/configuracoes/empresa')) {
      return 'organizacao';
    }
    if (url.includes('/configuracoes')) return 'configuracoes';
    return 'dashboard';
  });

  readonly activeSubItem = computed(() => {
    return null;
  });

  // Controle de submenus abertos
  readonly openSubmenus = signal<Record<string, boolean>>({});

  readonly mainMenuItems = signal<MenuItem[]>([
    { id: 'dashboard', route: '/dashboard', label: 'Dashboard', icon: 'dashboard', hasSubmenu: false },
    { id: 'aprovacoes', route: '/aprovacoes', label: 'Minhas Aprovações', icon: 'check_circle', badge: 3, badgeColor: '#644EF3', hasSubmenu: false },
    { id: 'solicitacoes', route: '/solicitacoes', label: 'Minhas solicitações', icon: 'description', hasSubmenu: false },
    { id: 'meus-fluxos', route: '/alcadas/minhas-alcadas', label: 'Meus Fluxos', icon: 'account_tree', hasSubmenu: false },
    { id: 'minhas-regras', route: '/alcadas/regras', label: 'Minhas Regras', icon: 'rule', hasSubmenu: false },
    { id: 'auditoria', route: '/auditoria', label: 'Trilha Criptográfica', icon: 'link', badge: 'SHA', badgeColor: '#10B981', hasSubmenu: false },
    { id: 'riscos', route: '/riscos', label: 'Motor de Riscos', icon: 'security', badge: 'Anti-Fraude', badgeColor: '#F59E0B', hasSubmenu: false },
    { id: 'delegacoes', route: '/delegacoes', label: 'Delegações & SoD', icon: 'group', hasSubmenu: false },
    { id: 'organizacao', route: '/configuracoes/organizacao', label: 'Organização & Empresa', icon: 'domain', hasSubmenu: false },
  ]);

  readonly departments = signal<DepartmentItem[]>([
    { id: 'eng', code: 'E', name: 'Engenharia', color: '#10B981', isPinned: true },
    { id: 'arq', code: 'A', name: 'Arquitetura', color: '#8B5CF6', isPinned: true },
    { id: 'ti', code: 'TI', name: 'Tecnologia & Infra', color: '#644EF3', isPinned: true },
    { id: 'fin', code: 'F', name: 'Controladoria & Finanças', color: '#F59E0B', isPinned: false },
    { id: 'op', code: 'O', name: 'Operações & Logística', color: '#EC4899', isPinned: false },
  ]);

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  isSubmenuOpen(itemId: string): boolean {
    return !!this.openSubmenus()[itemId];
  }

  toggleSubmenu(itemId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.openSubmenus.update((state) => ({
      ...state,
      [itemId]: !state[itemId],
    }));
  }

  selectItem(item: MenuItem): void {
    if (item.hasSubmenu && item.subItems && item.subItems.length > 0) {
      // Se a barra lateral estiver colapsada, expande para exibir as sub-opções
      if (this.isCollapsed()) {
        this.isCollapsed.set(false);
      }
      // Assegura que o submenu esteja visível
      this.openSubmenus.update((state) => ({
        ...state,
        [item.id]: true,
      }));
      // Se não estiver na rota de alçadas, direciona para a primeira sub-opção
      if (!this.currentUrl().includes('/alcadas')) {
        this.router.navigate([item.route]);
      }
    } else {
      this.router.navigate([item.route]);
    }
  }

  selectSubItem(subItem: SubMenuItem, event: Event): void {
    event.stopPropagation();
    this.router.navigate([subItem.route]);
  }

  togglePin(id: string, event: Event): void {
    event.stopPropagation();
    this.departments.update((items) =>
      items.map((item) => (item.id === id ? { ...item, isPinned: !item.isPinned } : item))
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
