import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SurveyService } from '../../services/survey.service';
import { FingerprintService } from '../../services/fingerprint.service';
import { SurveySession, SurveyFormData } from '../../models/survey.models';

@Component({
  selector: 'app-survey-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './survey-form.component.html',
  styleUrl: './survey-form.component.css'
})
export class SurveyFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  session = signal<SurveySession | null>(null);
  loading = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  alreadySubmitted = signal(false);
  errorMessage = signal('');
  currentStep = signal(1);

  // Señales para cálculo del préstamo
  selectedMonto = signal<number | null>(null);
  selectedCuotas = signal<number | null>(null);
  private _step1Valid = signal(false);
  private subs: Subscription[] = [];

  readonly MONTOS = [500000, 800000, 1000000];
  readonly CUOTAS_OPTIONS = [3, 6, 9, 12];
  readonly INTEREST_RATES: Record<number, number> = { 3: 0, 6: 8, 9: 15, 12: 22 };

  isStep1Valid = computed(() => this._step1Valid());

  loanSummary = computed(() => {
    const monto = this.selectedMonto();
    const cuotas = this.selectedCuotas();
    if (!monto || !cuotas) return null;
    const interes = this.INTEREST_RATES[cuotas] ?? 0;
    const montoTotal = monto * (1 + interes / 100);
    const cuotaMensual = montoTotal / cuotas;
    return { monto, cuotas, interes, montoTotal, cuotaMensual };
  });

  constructor(
    private fb: FormBuilder,
    private surveyService: SurveyService,
    private fingerprintService: FingerprintService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      conocia_lista:        ['', Validators.required],
      opinion_propuestas:   ['', Validators.required],
      voto_electronico:     ['', Validators.required],
      reeleccion_indefinida:['', Validators.required],
      propuesta_nueva:      [''],
      voto_simulado:        [''],
      monto_prestamo:       [null],
      cuotas_prestamo:      [null],
      motivo_prestamo:      ['']
    });

    const step1Fields = ['conocia_lista', 'opinion_propuestas', 'voto_electronico', 'reeleccion_indefinida'];
    this.subs.push(
      this.form.valueChanges.subscribe(() => {
        const valid = step1Fields.every(f => !!this.form.get(f)?.value);
        this._step1Valid.set(valid);
      })
    );

    this.subs.push(
      this.form.get('monto_prestamo')!.valueChanges.subscribe(v => {
        this.selectedMonto.set(v ? Number(v) : null);
        this.form.get('cuotas_prestamo')!.setValue(null, { emitEvent: false });
        this.selectedCuotas.set(null);
      })
    );

    this.subs.push(
      this.form.get('cuotas_prestamo')!.valueChanges.subscribe(v => {
        this.selectedCuotas.set(v ? Number(v) : null);
      })
    );

    this.loadSession();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private async loadSession(): Promise<void> {
    try {
      const session = await this.surveyService.getActiveSession();
      this.session.set(session);
      if (session && this.surveyService.checkLocalSubmission(session.id)) {
        this.alreadySubmitted.set(true);
      }
    } catch {
      this.errorMessage.set('Error al cargar la simulación');
    } finally {
      this.loading.set(false);
    }
  }

  nextStep(): void {
    if (this.currentStep() < 3) this.currentStep.update(s => s + 1);
  }

  prevStep(): void {
    if (this.currentStep() > 1) this.currentStep.update(s => s - 1);
  }

  canSubmit(): boolean {
    const monto = this.selectedMonto();
    if (!monto) return true;
    const cuotas = this.selectedCuotas();
    const motivo = this.form.get('motivo_prestamo')?.value?.trim();
    return !!cuotas && !!motivo;
  }

  // ── Helpers para el préstamo ──────────────────────────────────────

  fmt(value: number): string {
    return '$' + Math.round(value).toLocaleString('es-AR');
  }

  getInterest(cuotas: number): number {
    return this.INTEREST_RATES[cuotas] ?? 0;
  }

  getCuotaMensual(monto: number, cuotas: number): number {
    const interes = this.INTEREST_RATES[cuotas] ?? 0;
    return (monto * (1 + interes / 100)) / cuotas;
  }

  getMontoTotal(monto: number, cuotas: number): number {
    const interes = this.INTEREST_RATES[cuotas] ?? 0;
    return monto * (1 + interes / 100);
  }

  // ── Submit ────────────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    if (this.submitting()) return;

    const monto = this.selectedMonto();
    const cuotas = this.selectedCuotas();
    const motivo = this.form.get('motivo_prestamo')?.value?.trim();

    if (monto && !cuotas) {
      this.errorMessage.set('Por favor seleccioná la cantidad de cuotas.');
      return;
    }
    if (monto && !motivo) {
      this.errorMessage.set('El motivo del préstamo es obligatorio.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      const fingerprint = await this.fingerprintService.getFingerprint();
      const session = this.session()!;

      const formData: SurveyFormData = {
        conocia_lista:         this.form.get('conocia_lista')!.value,
        opinion_propuestas:    this.form.get('opinion_propuestas')!.value,
        voto_electronico:      this.form.get('voto_electronico')!.value,
        reeleccion_indefinida: this.form.get('reeleccion_indefinida')!.value,
        voto_simulado:         this.form.get('voto_simulado')!.value,
        propuesta_nueva:       this.form.get('propuesta_nueva')!.value
      };

      await this.surveyService.submitSurvey(session.id, formData, fingerprint);

      if (monto && cuotas) {
        const summary = this.loanSummary()!;
        await this.surveyService.submitLoanRequest(session.id, fingerprint, {
          monto: summary.monto,
          cuotas: summary.cuotas,
          interes_porcentaje: summary.interes,
          monto_total: summary.montoTotal,
          cuota_mensual: summary.cuotaMensual,
          motivo
        });
      }

      this.surveyService.markLocalSubmission(session.id);
      this.submitted.set(true);
    } catch (err: any) {
      if (err?.message?.includes('already_submitted') || err?.status === 409) {
        this.alreadySubmitted.set(true);
        this.surveyService.markLocalSubmission(this.session()!.id);
      } else {
        this.errorMessage.set('Error al enviar la simulación. Intentá de nuevo.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
