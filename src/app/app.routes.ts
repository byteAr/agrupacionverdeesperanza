import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PrivacidadComponent } from './privacidad/privacidad.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'privacidad', component: PrivacidadComponent }
];
