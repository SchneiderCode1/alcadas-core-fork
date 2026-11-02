import { Injectable, signal } from '@angular/core';
import { UserProfile } from '../models/user-profile.model';
import {
  ApiKeyItem,
  IntegrationConnector,
  NotificationChannelItem,
  OrganizationData,
  OrganizationDepartment,
  OrganizationEmployee,
  OrganizationPolicies,
} from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly userProfile = signal<UserProfile>({
    fullName: 'Julia Campos Santana',
    displayName: 'Julia Santana',
    cpf: '048.721.930-15',
    bio: 'Gerente Financeira responsável pela validação orçamentária de Capex, contratos de tecnologia e liberação de alçadas corporativas.',
    avatarUrl: null,
    avatarColor: '#0f172a',
    email: 'julia.santana@startop.com.br',
    additionalEmails: [
      { email: 'julia.santana@startop.com.br', isPrimary: true, verified: true },
      { email: 'diretoria.fin@startop.com.br', isPrimary: false, verified: true },
    ],
    phone: '+55 (61) 99350-0062',
    location: 'Brasília, DF — Brasil',
    timezone: 'America/Sao_Paulo (GMT-03:00)',
    company: 'Startop Sistemas & Governança LTDA',
    cnpj: '11.222.333/0001-81',
    jobTitle: 'Gerente Financeira Sênior',
    department: 'Controladoria & Finanças',
    employeeId: 'STP-0142',
    roles: ['Gerente', 'Aprovador Titular', 'Comitê Capex'],
    approvalLimit: 50000,
    costCenters: ['CC-101 · Clínicas', 'CC-204 · Obras & Expansão', 'CC-305 · Cloud & TI'],
    activeDelegation: null,
    signatureStyle: 'drawn',
    certificateIssuer: 'ICP-Brasil · SHA-256 ECDSA Ativo',
    lastAccess: new Date(),
    isActive: true,
    recentApprovals: [
      {
        id: 'apr-1',
        code: '#REQ-2048',
        title: 'Renovação Cluster Kubernetes Produção AWS',
        department: 'Tecnologia & Infra',
        amount: 38400,
        action: 'APROVADA',
        date: 'Hoje, 14:22',
        hash: '0x9f8b...4e21',
      },
      {
        id: 'apr-2',
        code: '#REQ-2041',
        title: 'Aquisição de Equipamentos Diagnóstico Unidade Sul',
        department: 'Operações & Logística',
        amount: 49900,
        action: 'APROVADA',
        date: 'Ontem, 17:05',
        hash: '0x3a1c...8b90',
      },
      {
        id: 'apr-3',
        code: '#REQ-2035',
        title: 'Consultoria Externa de Auditoria Tributária',
        department: 'Controladoria & Finanças',
        amount: 21500,
        action: 'VALIDADA',
        date: '29 Out, 11:18',
        hash: '0x7d4e...1c03',
      },
    ],
  });

  readonly organization = signal<OrganizationData>({
    cnpj: '11.222.333/0001-81',
    legalName: 'Startop Sistemas & Governança Corporativa LTDA',
    tradeName: 'Startop Enterprise',
    stateRegistration: '07.482.910/001-45',
    taxRegime: 'Lucro Real',
    corporateEmail: 'governanca@startop.com.br',
    corporatePhone: '+55 (61) 3321-8900',
    website: 'https://startop.com.br',
    address: {
      zip: '70070-120',
      street: 'SBS Quadra 2 Bloco E Edifício Prime Business',
      number: '206',
      complement: 'Andar 14 · Conjuntos 1401 a 1408',
      district: 'Asa Sul',
      city: 'Brasília',
      state: 'DF',
    },
    departments: [
      {
        id: 'dep-fin',
        code: 'FIN',
        name: 'Controladoria & Finanças',
        costCenter: 'CC-101',
        monthlyBudget: 450000,
        managerName: 'Julia Campos Santana',
        color: '#f59e0b',
      },
      {
        id: 'dep-ti',
        code: 'TI',
        name: 'Tecnologia & Infraestrutura',
        costCenter: 'CC-305',
        monthlyBudget: 320000,
        managerName: 'Rafael Costa Mendes',
        color: '#644ef3',
      },
      {
        id: 'dep-eng',
        code: 'ENG',
        name: 'Engenharia & Obras',
        costCenter: 'CC-204',
        monthlyBudget: 680000,
        managerName: 'Carlos Eduardo Lima',
        color: '#10b981',
      },
      {
        id: 'dep-op',
        code: 'OPE',
        name: 'Operações & Logística',
        costCenter: 'CC-402',
        monthlyBudget: 290000,
        managerName: 'Mariana Alves Rocha',
        color: '#ec4899',
      },
      {
        id: 'dep-jur',
        code: 'JUR',
        name: 'Jurídico & Compliance',
        costCenter: 'CC-501',
        monthlyBudget: 150000,
        managerName: 'Dr. Henrique Vasconcelos',
        color: '#0284c7',
      },
    ],
    employees: [
      {
        id: 'emp-1',
        employeeCode: 'STP-0142',
        fullName: 'Julia Campos Santana',
        email: 'julia.santana@startop.com.br',
        phone: '+55 (61) 99350-0062',
        jobTitle: 'Gerente Financeira Sênior',
        role: 'GERENTE',
        departmentId: 'dep-fin',
        departmentName: 'Controladoria & Finanças',
        approvalLimit: 50000,
        status: 'ATIVO',
        joinedAt: '12/03/2023',
      },
      {
        id: 'emp-2',
        employeeCode: 'STP-0018',
        fullName: 'Mariana Alves Rocha',
        email: 'mariana.alves@startop.com.br',
        phone: '+55 (61) 99812-4410',
        jobTitle: 'Diretora de Operações (COO)',
        role: 'DIRETOR',
        departmentId: 'dep-op',
        departmentName: 'Operações & Logística',
        approvalLimit: 200000,
        status: 'ATIVO',
        joinedAt: '05/01/2022',
      },
      {
        id: 'emp-3',
        employeeCode: 'STP-0094',
        fullName: 'Rafael Costa Mendes',
        email: 'rafael.costa@startop.com.br',
        phone: '+55 (11) 98741-3302',
        jobTitle: 'Head de Tecnologia & Cloud',
        role: 'GERENTE',
        departmentId: 'dep-ti',
        departmentName: 'Tecnologia & Infraestrutura',
        approvalLimit: 75000,
        status: 'ATIVO',
        joinedAt: '19/08/2023',
      },
      {
        id: 'emp-4',
        employeeCode: 'STP-0115',
        fullName: 'Carlos Eduardo Lima',
        email: 'carlos.lima@startop.com.br',
        phone: '+55 (11) 97210-1988',
        jobTitle: 'Engenheiro Líder de Expansão',
        role: 'ANALISTA',
        departmentId: 'dep-eng',
        departmentName: 'Engenharia & Obras',
        approvalLimit: 15000,
        status: 'ATIVO',
        joinedAt: '10/02/2024',
      },
      {
        id: 'emp-5',
        employeeCode: 'STP-0203',
        fullName: 'Ana Clara Souza',
        email: 'ana.souza@startop.com.br',
        phone: '+55 (61) 99123-7741',
        jobTitle: 'Analista de Suprimentos Pleno',
        role: 'SOLICITANTE',
        departmentId: 'dep-op',
        departmentName: 'Operações & Logística',
        approvalLimit: 0,
        status: 'ATIVO',
        joinedAt: '03/06/2024',
      },
      {
        id: 'emp-6',
        employeeCode: 'STP-0041',
        fullName: 'Henrique Vasconcelos',
        email: 'henrique.juridico@startop.com.br',
        phone: '+55 (61) 98400-5120',
        jobTitle: 'Auditor de Riscos & Compliance',
        role: 'AUDITOR',
        departmentId: 'dep-jur',
        departmentName: 'Jurídico & Compliance',
        approvalLimit: 30000,
        status: 'FERIAS',
        joinedAt: '14/05/2022',
      },
    ],
    policies: {
      defaultCurrency: 'BRL',
      autoApproveBelow: 500,
      defaultSlaHours: 24,
      autoEscalateOnSla: true,
      strictSod: true,
      requireCryptographicSignature: true,
      dualApprovalThreshold: 100000,
      minQuotesCount: 3,
      minQuotesThreshold: 10000,
      requireCostCenterOnRequests: true,
      auditRetentionYears: 7,
    },
  });

  readonly notifications = signal<NotificationChannelItem[]>([
    {
      id: 'notif-new-approval',
      title: 'Novas solicitações aguardando minha deliberação',
      description: 'Receba um aviso imediato quando uma requisição entrar na sua fila de alçada.',
      category: 'APROVACOES',
      emailEnabled: true,
      pushEnabled: true,
      whatsappEnabled: true,
    },
    {
      id: 'notif-sla-warning',
      title: 'Alerta preventivo de vencimento de SLA',
      description: 'Notificar 2 horas antes do prazo limite de aprovação expirar ou escalonar.',
      category: 'SLA',
      emailEnabled: true,
      pushEnabled: true,
      whatsappEnabled: false,
    },
    {
      id: 'notif-request-status',
      title: 'Atualizações nas minhas solicitações emitidas',
      description: 'Quando um aprovador aprovar, recusar ou solicitar revisão em um pedido seu.',
      category: 'APROVACOES',
      emailEnabled: true,
      pushEnabled: true,
      whatsappEnabled: false,
    },
    {
      id: 'notif-sod-conflict',
      title: 'Alertas do Motor Anti-Fraude e Conflito SoD',
      description: 'Avisos críticos de tentativa de fracionamento de despesa ou conflito de papéis.',
      category: 'SEGURANCA',
      emailEnabled: true,
      pushEnabled: true,
      whatsappEnabled: true,
    },
    {
      id: 'notif-weekly-digest',
      title: 'Relatório semanal de governança e execução orçamentária',
      description: 'Resumo executivo enviado toda segunda-feira às 08h com indicadores de alçada.',
      category: 'AUDITORIA',
      emailEnabled: true,
      pushEnabled: false,
      whatsappEnabled: false,
    },
  ]);

  readonly integrations = signal<IntegrationConnector[]>([
    {
      id: 'int-sap',
      name: 'SAP S/4HANA Cloud',
      provider: 'SAP SE',
      category: 'ERP',
      description: 'Sincroniza centros de custo, ordens de compra e bloqueio orçamentário em tempo real.',
      icon: 'dns',
      connected: true,
      lastSync: 'Há 12 minutos',
      endpointUrl: 'https://api.sap.startop.internal/v2/cost-centers',
    },
    {
      id: 'int-totvs',
      name: 'TOTVS Protheus',
      provider: 'TOTVS S.A.',
      category: 'ERP',
      description: 'Integração com módulo de compras, títulos financeiros e notas fiscais.',
      icon: 'account_balance',
      connected: false,
      lastSync: null,
    },
    {
      id: 'int-slack',
      name: 'Slack Enterprise Grid',
      provider: 'Salesforce / Slack',
      category: 'MENSAGERIA',
      description: 'Dispara notificações interativas de aprovação rápida nos canais dos gestores.',
      icon: 'forum',
      connected: true,
      lastSync: 'Ativo em #alcadas-alertas',
    },
    {
      id: 'int-icp',
      name: 'Validador ICP-Brasil & Carimbo de Tempo',
      provider: 'ITI / Bry Cert',
      category: 'ASSINATURA',
      description: 'Assinatura digital qualificada e hash criptográfico encadeado SHA-256.',
      icon: 'verified_user',
      connected: true,
      lastSync: 'Operacional (99.98% uptime)',
    },
  ]);

  readonly apiKeys = signal<ApiKeyItem[]>([
    {
      id: 'key-1',
      name: 'Conector ERP Produção (SAP)',
      prefix: 'alc_live_98f4...c21a',
      environment: 'production',
      createdAt: '10 Jan 2026',
      lastUsedAt: 'Há 4 minutos',
      scopes: ['requests:read', 'approvals:write', 'webhooks:trigger'],
    },
    {
      id: 'key-2',
      name: 'Ambiente de Homologação / QA',
      prefix: 'alc_test_41b0...8e09',
      environment: 'sandbox',
      createdAt: '18 Ago 2026',
      lastUsedAt: 'Ontem às 19:40',
      scopes: ['requests:read', 'rules:read'],
    },
  ]);

  updateUserProfile(patch: Partial<UserProfile>): void {
    this.userProfile.update((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  addContactEmail(email: string): boolean {
    const clean = email.trim().toLowerCase();
    if (!clean) return false;
    const exists = this.userProfile().additionalEmails.some(
      (e) => e.email.toLowerCase() === clean,
    );
    if (exists) return false;

    this.userProfile.update((prev) => ({
      ...prev,
      additionalEmails: [
        ...prev.additionalEmails,
        { email: clean, isPrimary: false, verified: false },
      ],
    }));
    return true;
  }

  removeContactEmail(email: string): void {
    this.userProfile.update((prev) => ({
      ...prev,
      additionalEmails: prev.additionalEmails.filter(
        (item) => item.email !== email || item.isPrimary,
      ),
    }));
  }

  setPrimaryEmail(email: string): void {
    this.userProfile.update((prev) => ({
      ...prev,
      email,
      additionalEmails: prev.additionalEmails.map((item) => ({
        ...item,
        isPrimary: item.email === email,
        verified: item.email === email ? true : item.verified,
      })),
    }));
  }

  updateCompanyDetails(
    patch: Partial<
      Pick<
        OrganizationData,
        | 'cnpj'
        | 'legalName'
        | 'tradeName'
        | 'stateRegistration'
        | 'taxRegime'
        | 'corporateEmail'
        | 'corporatePhone'
        | 'website'
        | 'address'
      >
    >,
  ): void {
    this.organization.update((prev) => ({
      ...prev,
      ...patch,
    }));
    if (patch.legalName || patch.cnpj) {
      this.userProfile.update((u) => ({
        ...u,
        company: patch.legalName ?? u.company,
        cnpj: patch.cnpj ?? u.cnpj,
      }));
    }
  }

  addDepartment(dept: Omit<OrganizationDepartment, 'id'>): OrganizationDepartment {
    const created: OrganizationDepartment = {
      ...dept,
      id: `dep-${Date.now()}`,
    };
    this.organization.update((prev) => ({
      ...prev,
      departments: [...prev.departments, created],
    }));
    return created;
  }

  updateDepartment(id: string, patch: Partial<OrganizationDepartment>): void {
    this.organization.update((prev) => ({
      ...prev,
      departments: prev.departments.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  }

  removeDepartment(id: string): void {
    this.organization.update((prev) => ({
      ...prev,
      departments: prev.departments.filter((d) => d.id !== id),
    }));
  }

  addEmployee(emp: Omit<OrganizationEmployee, 'id' | 'joinedAt'>): OrganizationEmployee {
    const created: OrganizationEmployee = {
      ...emp,
      id: `emp-${Date.now()}`,
      joinedAt: new Intl.DateTimeFormat('pt-BR').format(new Date()),
    };
    this.organization.update((prev) => ({
      ...prev,
      employees: [created, ...prev.employees],
    }));
    return created;
  }

  updateEmployee(id: string, patch: Partial<OrganizationEmployee>): void {
    this.organization.update((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  removeEmployee(id: string): void {
    this.organization.update((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
    }));
  }

  updatePolicies(policies: OrganizationPolicies): void {
    this.organization.update((prev) => ({
      ...prev,
      policies,
    }));
  }

  toggleNotification(
    id: string,
    channel: 'emailEnabled' | 'pushEnabled' | 'whatsappEnabled',
  ): void {
    this.notifications.update((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [channel]: !item[channel] } : item,
      ),
    );
  }

  toggleIntegration(id: string): void {
    this.integrations.update((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              connected: !item.connected,
              lastSync: !item.connected ? 'Sincronizado agora' : null,
            }
          : item,
      ),
    );
  }

  createApiKey(name: string, environment: 'production' | 'sandbox'): ApiKeyItem {
    const randomHex = Math.random().toString(16).substring(2, 6);
    const created: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name,
      prefix: `alc_${environment === 'production' ? 'live' : 'test'}_${randomHex}...9a2f`,
      environment,
      createdAt: 'Hoje',
      lastUsedAt: 'Nunca utilizada',
      scopes: ['requests:read', 'approvals:write'],
    };
    this.apiKeys.update((prev) => [created, ...prev]);
    return created;
  }

  revokeApiKey(id: string): void {
    this.apiKeys.update((prev) => prev.filter((k) => k.id !== id));
  }
}
