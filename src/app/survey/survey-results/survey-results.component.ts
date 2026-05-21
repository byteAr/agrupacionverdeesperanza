import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SurveyService } from '../../services/survey.service';
import { AuthService } from '../../services/auth.service';
import { SurveySession, SessionStats } from '../../models/survey.models';

@Component({
  selector: 'app-survey-results',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './survey-results.component.html',
  styleUrl: './survey-results.component.css'
})
export class SurveyResultsComponent implements OnInit, OnDestroy {
  sessions = signal<SurveySession[]>([]);
  selectedSession = signal<SurveySession | null>(null);
  stats = signal<SessionStats | null>(null);
  loading = signal(true);
  lastResponseTime = signal<Date | null>(null);
  displayedCount = signal(0);

  private channel: RealtimeChannel | null = null;
  private countInterval: any = null;

  isLive = computed(() => this.selectedSession()?.is_active ?? false);

  conociaChartData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const s = this.stats();
    if (!s) return { labels: [], datasets: [] };
    return {
      labels: ['Sí', 'No'],
      datasets: [{
        data: [s.conocia_lista.si, s.conocia_lista.no],
        backgroundColor: ['#2E7D32', '#E0E0E0'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    };
  });

  opinionChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const s = this.stats();
    if (!s) return { labels: [], datasets: [] };
    return {
      labels: ['Buenas', 'Muy buenas', 'Malas'],
      datasets: [{
        data: [s.opinion_propuestas.buenas, s.opinion_propuestas.muy_buenas, s.opinion_propuestas.malas],
        backgroundColor: ['#66BB6A', '#2E7D32', '#D32F2F'],
        borderRadius: 8,
        borderSkipped: false
      }]
    };
  });

  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, font: { size: 14 } } }
    },
    animation: { animateRotate: true, duration: 800 }
  };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, ticks: { stepSize: 1 } },
      y: { grid: { display: false } }
    },
    plugins: {
      legend: { display: false }
    },
    animation: { duration: 800 }
  };

  constructor(
    private surveyService: SurveyService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSessions();
  }

  ngOnDestroy(): void {
    this.unsubscribe();
    if (this.countInterval) clearInterval(this.countInterval);
  }

  private async loadSessions(): Promise<void> {
    try {
      const sessions = await this.surveyService.getAllSessions();
      this.sessions.set(sessions);

      const active = sessions.find(s => s.is_active);
      if (active) {
        await this.selectSession(active);
      } else if (sessions.length > 0) {
        await this.selectSession(sessions[0]);
      }
    } catch {
      // handle silently
    } finally {
      this.loading.set(false);
    }
  }

  async selectSession(session: SurveySession): Promise<void> {
    this.unsubscribe();
    this.selectedSession.set(session);
    this.lastResponseTime.set(null);

    await this.refreshStats();

    if (session.is_active) {
      this.channel = this.surveyService.subscribeToResponses(session.id, () => {
        this.lastResponseTime.set(new Date());
        this.refreshStats();
      });
    }
  }

  async onSessionChange(sessionId: string): Promise<void> {
    const session = this.sessions().find(s => s.id === sessionId);
    if (session) await this.selectSession(session);
  }

  private async refreshStats(): Promise<void> {
    const session = this.selectedSession();
    if (!session) return;

    const stats = await this.surveyService.getSessionStats(session.id);
    this.stats.set(stats);
    this.animateCount(stats.total_responses);
  }

  private animateCount(target: number): void {
    if (this.countInterval) clearInterval(this.countInterval);

    const current = this.displayedCount();
    if (current === target) return;

    const diff = target - current;
    const steps = Math.min(Math.abs(diff), 30);
    const increment = diff / steps;
    let step = 0;

    this.countInterval = setInterval(() => {
      step++;
      if (step >= steps) {
        this.displayedCount.set(target);
        clearInterval(this.countInterval);
      } else {
        this.displayedCount.set(Math.round(current + increment * step));
      }
    }, 30);
  }

  private unsubscribe(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  getTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return 'justo ahora';
    if (seconds < 60) return `hace ${seconds}s`;
    return `hace ${Math.floor(seconds / 60)}min`;
  }

  getPercentage(value: number, total: number): string {
    if (total === 0) return '0';
    return ((value / total) * 100).toFixed(1);
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
  }
}
