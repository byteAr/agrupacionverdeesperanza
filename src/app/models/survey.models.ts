export interface SurveySession {
  id: string;
  location_name: string;
  created_at: string;
  ended_at: string | null;
  is_active: boolean;
  created_by: string;
}

export interface SurveyResponse {
  id: string;
  session_id: string;
  conocia_lista: 'Sí' | 'No';
  opinion_propuestas: 'Sí' | 'No';
  voto_electronico: 'Sí' | 'No';
  reeleccion_indefinida: 'Sí' | 'No';
  voto_simulado: 'NARANJA' | 'ROJA' | 'AMARILLA' | 'BLANCO' | null;
  propuesta_nueva: string | null;
  fingerprint_hash: string;
  created_at: string;
}

export interface LoanRequest {
  id: string;
  session_id: string;
  fingerprint_hash: string;
  monto: number;
  cuotas: number;
  interes_porcentaje: number;
  monto_total: number;
  cuota_mensual: number;
  motivo: string;
  created_at: string;
}

export interface SessionStats {
  total_responses: number;
  conocia_lista: { si: number; no: number };
  opinion_propuestas: { si: number; no: number };
  voto_electronico: { si: number; no: number };
  reeleccion_indefinida: { si: number; no: number };
  voto_simulado: { naranja: number; roja: number; amarilla: number; blanco: number };
  propuestas_nuevas: Array<{ text: string; created_at: string }>;
}

export interface SurveyFormData {
  conocia_lista: 'Sí' | 'No' | '';
  opinion_propuestas: 'Sí' | 'No' | '';
  voto_electronico: 'Sí' | 'No' | '';
  reeleccion_indefinida: 'Sí' | 'No' | '';
  voto_simulado: 'NARANJA' | 'ROJA' | 'AMARILLA' | 'BLANCO' | '';
  propuesta_nueva: string;
}
