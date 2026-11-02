export interface CompanyAddress {
  zip: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
}

export interface OrganizationDepartment {
  id: string;
  code: string;
  name: string;
  costCenter: string;
  monthlyBudget: number;
  managerName: string;
  color: string;
  employeeCount?: number;
}

export type EmployeeRoleType =
  | 'SOLICITANTE'
  | 'ANALISTA'
  | 'GERENTE'
  | 'DIRETOR'
  | 'CFO'
  | 'ADMINISTRADOR'
  | 'AUDITOR';

export type EmployeeStatusType = 'ATIVO' | 'FERIAS' | 'INATIVO';

export interface OrganizationEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: EmployeeRoleType;
  departmentId: string;
  departmentName: string;
  approvalLimit: number;
  status: EmployeeStatusType;
  joinedAt: string;
}

export interface OrganizationPolicies {
  defaultCurrency: 'BRL' | 'USD' | 'EUR';
  autoApproveBelow: number;
  defaultSlaHours: number;
  autoEscalateOnSla: boolean;
  strictSod: boolean;
  requireCryptographicSignature: boolean;
  dualApprovalThreshold: number;
  minQuotesCount: number;
  minQuotesThreshold: number;
  requireCostCenterOnRequests: boolean;
  auditRetentionYears: number;
}

export interface OrganizationData {
  cnpj: string;
  legalName: string;
  tradeName: string;
  stateRegistration: string;
  taxRegime: string;
  corporateEmail: string;
  corporatePhone: string;
  website: string;
  address: CompanyAddress;
  departments: OrganizationDepartment[];
  employees: OrganizationEmployee[];
  policies: OrganizationPolicies;
}

export interface NotificationChannelItem {
  id: string;
  title: string;
  description: string;
  category: 'APROVACOES' | 'SLA' | 'SEGURANCA' | 'AUDITORIA';
  emailEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
}

export interface IntegrationConnector {
  id: string;
  name: string;
  provider: string;
  category: 'ERP' | 'MENSAGERIA' | 'ASSINATURA' | 'SSO';
  description: string;
  icon: string;
  connected: boolean;
  lastSync: string | null;
  endpointUrl?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  environment: 'production' | 'sandbox';
  createdAt: string;
  lastUsedAt: string;
  scopes: string[];
}
