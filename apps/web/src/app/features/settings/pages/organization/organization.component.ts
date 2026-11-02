import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SettingsService } from '../../services/settings.service';
import {
  cnpjValidator,
  formatCep,
  formatCnpj,
} from '../../validators/cnpj.validator';
import {
  EmployeeRoleType,
  EmployeeStatusType,
  OrganizationDepartment,
  OrganizationEmployee,
} from '../../models/organization.model';

export type OrganizationTabType =
  | 'company'
  | 'departments'
  | 'employees'
  | 'policies';

@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.scss',
})
export class OrganizationComponent {
  private readonly fb = inject(FormBuilder);
  readonly settingsService = inject(SettingsService);

  readonly activeTab = signal<OrganizationTabType>('company');
  readonly savedMessage = signal<string | null>(null);

  // Estado de Departamentos
  readonly isAddingDepartment = signal(false);
  readonly editingDepartmentId = signal<string | null>(null);
  readonly deptError = signal('');

  readonly deptColors = [
    '#644ef3',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#0284c7',
    '#0f172a',
  ];

  readonly deptForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(5)]],
    name: ['', Validators.required],
    costCenter: ['', Validators.required],
    monthlyBudget: [100000, [Validators.required, Validators.min(0)]],
    managerName: ['', Validators.required],
    color: ['#644ef3'],
  });

  // Estado de Funcionários
  readonly employeeSearch = signal('');
  readonly employeeDeptFilter = signal('TODOS');
  readonly isEmployeeFormOpen = signal(false);
  readonly editingEmployeeId = signal<string | null>(null);
  readonly employeeError = signal('');

  readonly employeeRoles: { value: EmployeeRoleType; label: string }[] = [
    { value: 'SOLICITANTE', label: 'Solicitante' },
    { value: 'ANALISTA', label: 'Analista Validador' },
    { value: 'GERENTE', label: 'Gerente Aprovador' },
    { value: 'DIRETOR', label: 'Diretor Executivo' },
    { value: 'CFO', label: 'CFO / Comitê Financeiro' },
    { value: 'ADMINISTRADOR', label: 'Administrador Geral' },
    { value: 'AUDITOR', label: 'Auditor & Compliance' },
  ];

  readonly employeeForm = this.fb.nonNullable.group({
    employeeCode: ['STP-0210', Validators.required],
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    jobTitle: ['', Validators.required],
    role: ['GERENTE' as EmployeeRoleType, Validators.required],
    departmentId: ['dep-fin', Validators.required],
    approvalLimit: [25000, [Validators.required, Validators.min(0)]],
    status: ['ATIVO' as EmployeeStatusType, Validators.required],
  });

  readonly org = this.settingsService.organization;

  readonly filteredEmployees = computed(() => {
    const q = this.employeeSearch().trim().toLowerCase();
    const dept = this.employeeDeptFilter();
    return this.org().employees.filter((emp) => {
      const matchesDept = dept === 'TODOS' || emp.departmentId === dept;
      const matchesQuery =
        !q ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.jobTitle.toLowerCase().includes(q);
      return matchesDept && matchesQuery;
    });
  });

  // Formulário 1: Dados da Empresa
  readonly companyForm = this.fb.nonNullable.group({
    tradeName: [this.org().tradeName, Validators.required],
    legalName: [this.org().legalName, Validators.required],
    cnpj: [this.org().cnpj, [Validators.required, cnpjValidator]],
    stateRegistration: [this.org().stateRegistration],
    taxRegime: [this.org().taxRegime],
    corporateEmail: [
      this.org().corporateEmail,
      [Validators.required, Validators.email],
    ],
    corporatePhone: [this.org().corporatePhone],
    website: [this.org().website],
    address: this.fb.nonNullable.group({
      zip: [
        this.org().address.zip,
        [Validators.required, Validators.pattern(/^\d{5}-\d{3}$/)],
      ],
      street: [this.org().address.street, Validators.required],
      number: [this.org().address.number, Validators.required],
      complement: [this.org().address.complement],
      district: [this.org().address.district],
      city: [this.org().address.city, Validators.required],
      state: [
        this.org().address.state,
        [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)],
      ],
    }),
  });

  // Formulário 4: Políticas do Projeto
  readonly policiesForm = this.fb.nonNullable.group({
    defaultCurrency: [this.org().policies.defaultCurrency],
    autoApproveBelow: [
      this.org().policies.autoApproveBelow,
      [Validators.required, Validators.min(0)],
    ],
    defaultSlaHours: [
      this.org().policies.defaultSlaHours,
      [Validators.required, Validators.min(1)],
    ],
    autoEscalateOnSla: [this.org().policies.autoEscalateOnSla],
    strictSod: [this.org().policies.strictSod],
    requireCryptographicSignature: [
      this.org().policies.requireCryptographicSignature,
    ],
    dualApprovalThreshold: [
      this.org().policies.dualApprovalThreshold,
      [Validators.required, Validators.min(0)],
    ],
    minQuotesCount: [
      this.org().policies.minQuotesCount,
      [Validators.required, Validators.min(1)],
    ],
    minQuotesThreshold: [
      this.org().policies.minQuotesThreshold,
      [Validators.required, Validators.min(0)],
    ],
    requireCostCenterOnRequests: [
      this.org().policies.requireCostCenterOnRequests,
    ],
    auditRetentionYears: [
      this.org().policies.auditRetentionYears,
      [Validators.required, Validators.min(1)],
    ],
  });

  selectTab(tab: OrganizationTabType): void {
    this.activeTab.set(tab);
    this.savedMessage.set(null);
  }

  maskCnpjInput(): void {
    const ctrl = this.companyForm.controls.cnpj;
    ctrl.setValue(formatCnpj(ctrl.value), { emitEvent: false });
  }

  maskCepInput(): void {
    const ctrl = this.companyForm.controls.address.controls.zip;
    ctrl.setValue(formatCep(ctrl.value), { emitEvent: false });
  }

  saveCompany(): void {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }
    this.settingsService.updateCompanyDetails(this.companyForm.getRawValue());
    this.companyForm.markAsPristine();
    this.showFeedback('Dados corporativos da empresa salvos com sucesso.');
  }

  discardCompany(): void {
    const current = this.org();
    this.companyForm.reset({
      tradeName: current.tradeName,
      legalName: current.legalName,
      cnpj: current.cnpj,
      stateRegistration: current.stateRegistration,
      taxRegime: current.taxRegime,
      corporateEmail: current.corporateEmail,
      corporatePhone: current.corporatePhone,
      website: current.website,
      address: current.address,
    });
    this.savedMessage.set(null);
  }

  // --- Gestão de Departamentos ---
  openNewDepartmentForm(): void {
    this.editingDepartmentId.set(null);
    this.deptForm.reset({
      code: '',
      name: '',
      costCenter: `CC-${Math.floor(100 + Math.random() * 899)}`,
      monthlyBudget: 150000,
      managerName: '',
      color: '#644ef3',
    });
    this.deptError.set('');
    this.isAddingDepartment.set(true);
  }

  editDepartment(dept: OrganizationDepartment): void {
    this.editingDepartmentId.set(dept.id);
    this.deptForm.reset({
      code: dept.code,
      name: dept.name,
      costCenter: dept.costCenter,
      monthlyBudget: dept.monthlyBudget,
      managerName: dept.managerName,
      color: dept.color,
    });
    this.deptError.set('');
    this.isAddingDepartment.set(true);
  }

  cancelDepartmentForm(): void {
    this.isAddingDepartment.set(false);
    this.editingDepartmentId.set(null);
    this.deptError.set('');
  }

  saveDepartment(): void {
    if (this.deptForm.invalid) {
      this.deptForm.markAllAsTouched();
      this.deptError.set('Preencha todos os campos obrigatórios do departamento.');
      return;
    }
    const raw = this.deptForm.getRawValue();
    const editingId = this.editingDepartmentId();
    const duplicate = this.org().departments.some(
      (d) =>
        d.id !== editingId &&
        d.name.trim().toLowerCase() === raw.name.trim().toLowerCase(),
    );
    if (duplicate) {
      this.deptError.set('Já existe um departamento registrado com este nome.');
      return;
    }

    if (editingId) {
      this.settingsService.updateDepartment(editingId, {
        ...raw,
        code: raw.code.toUpperCase(),
      });
      this.showFeedback('Departamento atualizado com sucesso.');
    } else {
      this.settingsService.addDepartment({
        ...raw,
        code: raw.code.toUpperCase(),
      });
      this.showFeedback('Novo departamento registrado na organização.');
    }
    this.cancelDepartmentForm();
  }

  deleteDepartment(id: string): void {
    this.settingsService.removeDepartment(id);
    this.showFeedback('Departamento removido.');
  }

  // --- Gestão de Funcionários ---
  openNewEmployeeForm(): void {
    this.editingEmployeeId.set(null);
    const nextNum = 210 + this.org().employees.length;
    const defaultDept = this.org().departments[0]?.id ?? '';
    this.employeeForm.reset({
      employeeCode: `STP-0${nextNum}`,
      fullName: '',
      email: '',
      phone: '',
      jobTitle: '',
      role: 'SOLICITANTE',
      departmentId: defaultDept,
      approvalLimit: 0,
      status: 'ATIVO',
    });
    this.employeeError.set('');
    this.isEmployeeFormOpen.set(true);
  }

  editEmployee(emp: OrganizationEmployee): void {
    this.editingEmployeeId.set(emp.id);
    this.employeeForm.reset({
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      jobTitle: emp.jobTitle,
      role: emp.role,
      departmentId: emp.departmentId,
      approvalLimit: emp.approvalLimit,
      status: emp.status,
    });
    this.employeeError.set('');
    this.isEmployeeFormOpen.set(true);
  }

  cancelEmployeeForm(): void {
    this.isEmployeeFormOpen.set(false);
    this.editingEmployeeId.set(null);
    this.employeeError.set('');
  }

  saveEmployee(): void {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      this.employeeError.set('Verifique os campos obrigatórios do funcionário.');
      return;
    }
    const val = this.employeeForm.getRawValue();
    const editingId = this.editingEmployeeId();
    const deptObj = this.org().departments.find((d) => d.id === val.departmentId);
    const departmentName = deptObj ? deptObj.name : 'Geral';

    if (editingId) {
      this.settingsService.updateEmployee(editingId, {
        ...val,
        departmentName,
      });
      this.showFeedback('Cadastro do funcionário atualizado.');
    } else {
      this.settingsService.addEmployee({
        ...val,
        departmentName,
      });
      this.showFeedback('Funcionário registrado com sucesso na organização.');
    }
    this.cancelEmployeeForm();
  }

  deleteEmployee(id: string): void {
    this.settingsService.removeEmployee(id);
    this.showFeedback('Funcionário removido do quadro ativo.');
  }

  // --- Políticas do Projeto ---
  savePolicies(): void {
    if (this.policiesForm.invalid) {
      this.policiesForm.markAllAsTouched();
      return;
    }
    this.settingsService.updatePolicies(this.policiesForm.getRawValue());
    this.policiesForm.markAsPristine();
    this.showFeedback('Políticas de governança do projeto atualizadas.');
  }

  employeesCountByDept(deptId: string): number {
    return this.org().employees.filter((e) => e.departmentId === deptId).length;
  }

  employeeInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  invalid(ctrl: { touched: boolean; invalid: boolean }): boolean {
    return ctrl.touched && ctrl.invalid;
  }

  private showFeedback(msg: string): void {
    this.savedMessage.set(msg);
  }
}
