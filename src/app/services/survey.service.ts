import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { SurveySession, SessionStats, SurveyFormData } from '../models/survey.models';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  constructor(private supabase: SupabaseService) {}

  async getActiveSession(): Promise<SurveySession | null> {
    const { data, error } = await this.supabase.client
      .from('survey_sessions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getSessionById(id: string): Promise<SurveySession | null> {
    const { data, error } = await this.supabase.client
      .from('survey_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getAllSessions(): Promise<SurveySession[]> {
    const { data, error } = await this.supabase.client
      .from('survey_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async createSession(locationName: string): Promise<SurveySession> {
    const { data: { user } } = await this.supabase.client.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // End any active sessions first
    await this.supabase.client
      .from('survey_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('is_active', true);

    const { data, error } = await this.supabase.client
      .from('survey_sessions')
      .insert({ location_name: locationName, created_by: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async endSession(sessionId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('survey_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async submitSurvey(sessionId: string, formData: SurveyFormData, fingerprintHash: string): Promise<void> {
    // Check for duplicate
    const { data: existing } = await this.supabase.client
      .from('submission_controls')
      .select('id')
      .eq('session_id', sessionId)
      .eq('fingerprint_hash', fingerprintHash)
      .maybeSingle();

    if (existing) {
      const err: any = new Error('already_submitted');
      err.status = 409;
      throw err;
    }

    // Insert submission control
    const { error: controlError } = await this.supabase.client
      .from('submission_controls')
      .insert({ session_id: sessionId, fingerprint_hash: fingerprintHash, ip_address: '0.0.0.0' });

    if (controlError) {
      if (controlError.code === '23505') {
        const err: any = new Error('already_submitted');
        err.status = 409;
        throw err;
      }
      throw controlError;
    }

    // Insert survey response
    const { error: responseError } = await this.supabase.client
      .from('survey_responses')
      .insert({
        session_id: sessionId,
        nombre_apellido: formData.nombre_apellido || null,
        dni: formData.dni || null,
        telefono: formData.telefono || null,
        conocia_lista: formData.conocia_lista,
        opinion_propuestas: formData.opinion_propuestas,
        voto_electronico: formData.voto_electronico || null,
        voto_simulado: formData.voto_simulado || null,
        propuesta_nueva: formData.propuesta_nueva || null,
        fingerprint_hash: fingerprintHash
      });

    if (responseError) throw responseError;
  }

  async getSessionStats(sessionId: string): Promise<SessionStats> {
    const { data, error } = await this.supabase.client
      .rpc('get_session_stats', { p_session_id: sessionId });

    if (error) throw error;
    return data as SessionStats;
  }

  async getResponseCount(sessionId: string): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('survey_responses')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (error) throw error;
    return count ?? 0;
  }

  subscribeToResponses(sessionId: string, callback: () => void): RealtimeChannel {
    return this.supabase.client
      .channel(`responses-${sessionId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'survey_responses', filter: `session_id=eq.${sessionId}` },
        () => callback()
      )
      .subscribe();
  }

  checkLocalSubmission(sessionId: string): boolean {
    return localStorage.getItem(`survey_submitted_${sessionId}`) === 'true';
  }

  markLocalSubmission(sessionId: string): void {
    localStorage.setItem(`survey_submitted_${sessionId}`, 'true');
  }
}
