import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
export class SurveyFormComponent implements OnInit {
  form!: FormGroup;
  session = signal<SurveySession | null>(null);
  loading = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  alreadySubmitted = signal(false);
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private surveyService: SurveyService,
    private fingerprintService: FingerprintService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre_apellido: [''],
      dni: [''],
      telefono: [''],
      conocia_lista: ['', Validators.required],
      opinion_propuestas: ['', Validators.required],
      propuesta_nueva: ['']
    });

    this.loadSession();
  }

  private async loadSession(): Promise<void> {
    try {
      const session = await this.surveyService.getActiveSession();
      this.session.set(session);

      if (session && this.surveyService.checkLocalSubmission(session.id)) {
        this.alreadySubmitted.set(true);
      }
    } catch {
      this.errorMessage.set('Error al cargar la encuesta');
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      const fingerprint = await this.fingerprintService.getFingerprint();
      const session = this.session()!;
      const formData: SurveyFormData = this.form.value;

      await this.surveyService.submitSurvey(session.id, formData, fingerprint);
      this.surveyService.markLocalSubmission(session.id);
      this.submitted.set(true);
    } catch (err: any) {
      if (err?.message?.includes('already_submitted') || err?.status === 409) {
        this.alreadySubmitted.set(true);
        this.surveyService.markLocalSubmission(this.session()!.id);
      } else {
        this.errorMessage.set('Error al enviar la encuesta. Intentá de nuevo.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
