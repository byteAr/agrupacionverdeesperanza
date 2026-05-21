import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SurveyService } from '../../services/survey.service';
import { AuthService } from '../../services/auth.service';
import { SurveySession } from '../../models/survey.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  activeSession = signal<SurveySession | null>(null);
  pastSessions = signal<SurveySession[]>([]);
  activeResponseCount = signal(0);
  sessionCounts = signal<Record<string, number>>({});
  loading = signal(true);
  creating = signal(false);
  ending = signal(false);
  confirmEnd = signal(false);
  newSessionForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private surveyService: SurveyService,
    private authService: AuthService,
    private router: Router
  ) {
    this.newSessionForm = this.fb.group({
      location_name: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.loadSessions();
  }

  private async loadSessions(): Promise<void> {
    try {
      const sessions = await this.surveyService.getAllSessions();
      const active = sessions.find(s => s.is_active) ?? null;
      const past = sessions.filter(s => !s.is_active);

      this.activeSession.set(active);
      this.pastSessions.set(past);

      if (active) {
        const count = await this.surveyService.getResponseCount(active.id);
        this.activeResponseCount.set(count);
      }

      const counts: Record<string, number> = {};
      for (const s of past) {
        counts[s.id] = await this.surveyService.getResponseCount(s.id);
      }
      this.sessionCounts.set(counts);
    } catch {
      // handle silently
    } finally {
      this.loading.set(false);
    }
  }

  async createSession(): Promise<void> {
    if (this.newSessionForm.invalid || this.creating()) return;

    this.creating.set(true);
    try {
      const locationName = this.newSessionForm.value.location_name.trim();
      await this.surveyService.createSession(locationName);
      this.newSessionForm.reset();
      this.confirmEnd.set(false);
      await this.loadSessions();
    } catch (err: any) {
      // handle error
    } finally {
      this.creating.set(false);
    }
  }

  async endSession(): Promise<void> {
    const session = this.activeSession();
    if (!session || this.ending()) return;

    this.ending.set(true);
    try {
      await this.surveyService.endSession(session.id);
      this.confirmEnd.set(false);
      await this.loadSessions();
    } catch {
      // handle error
    } finally {
      this.ending.set(false);
    }
  }

  toggleConfirmEnd(): void {
    this.confirmEnd.set(!this.confirmEnd());
  }

  viewResults(sessionId?: string): void {
    if (sessionId) {
      this.router.navigate(['/encuesta'], { queryParams: { session: sessionId } });
    } else {
      this.router.navigate(['/encuesta']);
    }
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
