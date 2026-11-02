import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { SettingsService } from '../../services/settings.service';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let settingsService: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [SettingsService, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService);
    fixture.detectChanges();
  });

  it('deve criar o componente de perfil', () => {
    expect(component).toBeTruthy();
  });

  it('deve alternar entre as abas do perfil', () => {
    expect(component.activeTab()).toBe('details');
    component.selectTab('contacts');
    expect(component.activeTab()).toBe('contacts');
    component.selectTab('authority');
    expect(component.activeTab()).toBe('authority');
    component.selectTab('history');
    expect(component.activeTab()).toBe('history');
  });

  it('deve salvar alterações válidas do perfil pessoal', () => {
    component.form.patchValue({
      displayName: 'Julia C. Santana',
      fullName: 'Julia Campos Santana',
    });
    component.save();
    expect(settingsService.userProfile().displayName).toBe('Julia C. Santana');
    expect(component.savedFeedback()).toBe(true);
  });

  it('deve adicionar e remover e-mail secundário de contato', () => {
    const initialCount = settingsService.userProfile().additionalEmails.length;
    component.newContactEmail.set('julia.secundario@startop.com.br');
    component.addEmail();
    expect(settingsService.userProfile().additionalEmails.length).toBe(
      initialCount + 1,
    );

    component.removeEmail('julia.secundario@startop.com.br');
    expect(settingsService.userProfile().additionalEmails.length).toBe(
      initialCount,
    );
  });
});
