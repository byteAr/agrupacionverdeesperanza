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
  nombre_apellido: string | null;
  dni: string | null;
  telefono: string | null;
  conocia_lista: 'Sí' | 'No' | 'No sé';
  opinion_propuestas: 'Sí' | 'No' | 'No sé';
  voto_electronico: 'Sí' | 'No' | 'No sé';
  voto_simulado: 'NARANJA' | 'ROJA' | 'AMARILLA' | 'BLANCO' | null;
  propuesta_nueva: string | null;
  fingerprint_hash: string;
  created_at: string;
}

export interface SessionStats {
  total_responses: number;
  conocia_lista: { si: number; no: number; nose: number };
  opinion_propuestas: { si: number; no: number; nose: number };
  voto_electronico: { si: number; no: number; nose: number };
  voto_simulado: { naranja: number; roja: number; amarilla: number; blanco: number };
  propuestas_nuevas: Array<{ text: string; created_at: string }>;
}

export interface SurveyFormData {
  nombre_apellido: string;
  dni: string;
  telefono: string;
  conocia_lista: 'Sí' | 'No' | 'No sé' | '';
  opinion_propuestas: 'Sí' | 'No' | 'No sé' | '';
  voto_electronico: 'Sí' | 'No' | 'No sé' | '';
  voto_simulado: 'NARANJA' | 'ROJA' | 'AMARILLA' | 'BLANCO' | '';
  propuesta_nueva: string;
}
