import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PrivacidadComponent } from './privacidad/privacidad.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'privacidad', component: PrivacidadComponent },
  {
    path: 'socios',
    loadComponent: () => import('./survey/survey-form/survey-form.component').then(m => m.SurveyFormComponent)
  },
  {
    path: 'encuesta',
    loadComponent: () => import('./survey/survey-results/survey-results.component').then(m => m.SurveyResultsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
