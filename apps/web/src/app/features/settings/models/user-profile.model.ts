export interface ContactEmailItem {
  email: string;
  isPrimary: boolean;
  verified: boolean;
}

export interface ApprovalHistorySummary {
  id: string;
  code: string;
  title: string;
  department: string;
  amount: number;
  action: 'APROVADA' | 'VALIDADA' | 'RECUSADA' | 'DELEGADA';
  date: string;
  hash: string;
}

export interface UserProfile {
  fullName: string;
  displayName: string;
  cpf: string;
  bio: string;
  avatarUrl: string | null;
  avatarColor: string;
  email: string;
  additionalEmails: ContactEmailItem[];
  phone: string;
  location: string;
  timezone: string;
  company: string;
  cnpj: string;
  jobTitle: string;
  department: string;
  employeeId: string;
  roles: string[];
  approvalLimit: number;
  costCenters: string[];
  activeDelegation: string | null;
  signatureStyle: 'drawn' | 'typed' | 'certificate';
  certificateIssuer: string;
  lastAccess: Date;
  isActive: boolean;
  recentApprovals: ApprovalHistorySummary[];
}
