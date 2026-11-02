import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../../services/settings.service';
import { formatCpf } from '../../validators/cnpj.validator';

export type ProfileTabType = 'details' | 'contacts' | 'authority' | 'history';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  readonly settingsService = inject(SettingsService);

  readonly activeTab = signal<ProfileTabType>('details');
  readonly savedFeedback = signal(false);
  readonly newContactEmail = signal('');
  readonly emailError = signal('');

  readonly avatarColors = [
    '#0f172a',
    '#644ef3',
    '#0284c7',
    '#059669',
    '#d97706',
    '#e11d48',
  ];

  readonly user = this.settingsService.userProfile;

  readonly initials = computed(() => {
    const full = this.user().fullName || 'U';
    return full
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  readonly formattedLimit = computed(() =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.user().approvalLimit),
  );

  readonly formattedLastAccess = computed(() =>
    new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(this.user().lastAccess),
  );

  readonly form = this.fb.nonNullable.group({
    displayName: [this.user().displayName, Validators.required],
    fullName: [this.user().fullName, Validators.required],
    cpf: [this.user().cpf, Validators.required],
    bio: [this.user().bio],
    email: [this.user().email, [Validators.required, Validators.email]],
    phone: [this.user().phone, Validators.required],
    location: [this.user().location],
    timezone: [this.user().timezone],
    signatureStyle: [this.user().signatureStyle],
  });

  selectTab(tab: ProfileTabType): void {
    this.activeTab.set(tab);
    this.savedFeedback.set(false);
  }

  selectAvatarColor(color: string): void {
    this.settingsService.updateUserProfile({ avatarColor: color });
    this.savedFeedback.set(true);
  }

  maskUserCpf(): void {
    const ctrl = this.form.controls.cpf;
    ctrl.setValue(formatCpf(ctrl.value), { emitEvent: false });
  }

  addEmail(): void {
    const raw = this.newContactEmail().trim();
    if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      this.emailError.set('Informe um endereço de e-mail válido.');
      return;
    }
    const ok = this.settingsService.addContactEmail(raw);
    if (!ok) {
      this.emailError.set('Este e-mail já está cadastrado na sua conta.');
      return;
    }
    this.newContactEmail.set('');
    this.emailError.set('');
  }

  removeEmail(email: string): void {
    this.settingsService.removeContactEmail(email);
  }

  makePrimaryEmail(email: string): void {
    this.settingsService.setPrimaryEmail(email);
    this.form.controls.email.setValue(email);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.getRawValue();
    this.settingsService.updateUserProfile({
      displayName: val.displayName,
      fullName: val.fullName,
      cpf: val.cpf,
      bio: val.bio,
      email: val.email,
      phone: val.phone,
      location: val.location,
      timezone: val.timezone,
      signatureStyle: val.signatureStyle,
    });
    this.form.markAsPristine();
    this.savedFeedback.set(true);
  }

  discard(): void {
    const current = this.user();
    this.form.reset({
      displayName: current.displayName,
      fullName: current.fullName,
      cpf: current.cpf,
      bio: current.bio,
      email: current.email,
      phone: current.phone,
      location: current.location,
      timezone: current.timezone,
      signatureStyle: current.signatureStyle,
    });
    this.savedFeedback.set(false);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}
