import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DigitalSignatureModalComponent } from './digital-signature-modal.component';

describe('DigitalSignatureModalComponent', () => {
  let component: DigitalSignatureModalComponent;
  let fixture: ComponentFixture<DigitalSignatureModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DigitalSignatureModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DigitalSignatureModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle agreement and reset warning', () => {
    expect(component.isAgreed()).toBe(false);
    component.showAgreementWarning.set(true);

    component.toggleAgreement();
    expect(component.isAgreed()).toBe(true);
    expect(component.showAgreementWarning()).toBe(false);
  });

  it('should show warning if user tries to confirm without agreeing', () => {
    expect(component.isAgreed()).toBe(false);
    const confirmedSpy = jest.fn();
    component.confirmed.subscribe(confirmedSpy);

    component.confirmSignature();

    expect(component.showAgreementWarning()).toBe(true);
    expect(confirmedSpy).not.toHaveBeenCalled();
  });

  it('should emit confirmed when user agrees and confirms signature', () => {
    component.toggleAgreement();
    const confirmedSpy = jest.fn();
    component.confirmed.subscribe(confirmedSpy);

    component.confirmSignature();

    expect(confirmedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        comentario: expect.any(String),
      })
    );
  });

  it('should emit closed when closeModal is called', () => {
    const closedSpy = jest.fn();
    component.closed.subscribe(closedSpy);

    component.closeModal();

    expect(closedSpy).toHaveBeenCalled();
  });

  it('should toggle sign mode', () => {
    expect(component.signMode()).toBe('draw');
    component.toggleSignMode();
    expect(component.signMode()).toBe('type');
    component.toggleSignMode();
    expect(component.signMode()).toBe('draw');
  });

  it('usa o nome do aprovador logado como rubrica digitada ao abrir', () => {
    fixture.componentRef.setInput('signatario', 'Carlos Gerente');
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();

    expect(component.typedSignature()).toBe('Carlos Gerente');
  });
});
