import { Injectable } from '@angular/core';
import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export type BetStatus = 'open' | 'accepted' | 'completed' | 'cancelled';
export type StakeType = 'money' | 'other' | null;
export type WinnerStatus = 'none' | 'proposed' | 'confirmed' | 'rejected';
export type CancelStatus = 'none' | 'proposed' | 'confirmed' | 'rejected';

export interface Profile {
  id: string;
  username: string;
  email?: string | null;
  is_adult: boolean;
  created_at: string;
}

export interface Bet {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  invited_username: string | null;
  stake_type: StakeType;
  stake_amount: number | null;
  stake_currency: string | null;
  stake_text: string | null;
  status: BetStatus;
  created_at: string;

  winner_id?: string | null;
  winner_proposed_by?: string | null;
  winner_status?: WinnerStatus | null;
  winner_proposed_at?: string | null;
  winner_confirmed_at?: string | null;
  winner_confirmed_by?: string | null;

  rule_template_key?: string | null;
  rules_text?: string | null;

  created_lat?: number | null;
  created_lng?: number | null;
  completed_lat?: number | null;
  completed_lng?: number | null;

  cancel_status?: CancelStatus | null;
  cancel_requested_by?: string | null;
  cancel_confirmed_by?: string | null;
  cancel_requested_at?: string | null;
  cancel_confirmed_at?: string | null;
}

export interface BetPhoto {
  id: string;
  bet_id: string;
  user_id: string;
  photo_url: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }

  // ---------- Auth ----------

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  }

  async signUp(email: string, password: string, username: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error('Kein Benutzer nach Registrierung vorhanden.');

    const { error: profileError } = await this.supabase
      .from('profiles')
      .insert({
        id: user.id,
        username,
        email,
        is_adult: true,
      });

    if (profileError) {
      console.error('Profile insert error', profileError);
      throw profileError;
    }

    return user;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  async signInWithIdentifier(identifier: string, password: string) {
    const trimmed = identifier.trim();

    if (trimmed.includes('@')) {
      return this.signIn(trimmed, password);
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('email')
      .eq('username', trimmed)
      .single();

    if (error) {
      console.error('Error loading profile by username', error);
      throw new Error('Kein Benutzer mit diesem Username gefunden.');
    }

    const email = (data as { email: string | null }).email;
    if (!email) {
      throw new Error(
        'Für diesen Username ist keine E-Mail hinterlegt. Bitte mit E-Mail registrieren oder erneut versuchen.'
      );
    }

    return this.signIn(email, password);
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getUser(): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  }

  // ---------- Profile ----------

  async getProfile(): Promise<Profile | null> {
    const user = await this.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data as Profile;
  }

  async searchProfilesByUsername(query: string): Promise<Profile[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${trimmed}%`)
      .limit(10);

    if (error) throw error;
    return (data ?? []) as Profile[];
  }

  // ---------- Bets ----------

  async listBets(): Promise<Bet[]> {
    const { data, error } = await this.supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Bet[];
  }

  async getBetById(id: string): Promise<Bet | null> {
    const { data, error } = await this.supabase
      .from('bets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Bet;
  }

  async createBet(payload: {
    title: string;
    description?: string | null;
    invitedUsername: string | null;
    stakeType: StakeType;
    stakeAmount?: number | null;
    stakeCurrency?: string | null;
    stakeText?: string | null;
    ruleTemplateKey: string;
    rulesText: string;
    createdLat?: number | null;
    createdLng?: number | null;
  }): Promise<Bet> {
    const { data: userData, error: userError } =
      await this.supabase.auth.getUser();

    if (userError) throw userError;

    const user = userData.user;
    if (!user) throw new Error('Kein eingeloggter Benutzer.');

    const { data, error } = await this.supabase
      .from('bets')
      .insert({
        owner_id: user.id,
        title: payload.title,
        description: payload.description ?? null,
        invited_username: payload.invitedUsername ?? null,
        stake_type: payload.stakeType,
        stake_amount: payload.stakeAmount ?? null,
        stake_currency: payload.stakeCurrency ?? null,
        stake_text: payload.stakeText ?? null,
        status: 'open',
        rule_template_key: payload.ruleTemplateKey,
        rules_text: payload.rulesText,
        created_lat: payload.createdLat ?? null,
        created_lng: payload.createdLng ?? null,
        winner_status: 'none',
        cancel_status: 'none',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as Bet;
  }

  async acceptBet(betId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bets')
      .update({ status: 'accepted' })
      .eq('id', betId);

    if (error) throw error;
  }

  // ----- Abbruch mit Bestätigung -----

  async requestCancelBet(betId: string): Promise<void> {
    const user = await this.getUser();
    if (!user) throw new Error('Nicht eingeloggt.');

    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from('bets')
      .update({
        cancel_status: 'proposed',
        cancel_requested_by: user.id,
        cancel_requested_at: now,
        cancel_confirmed_by: null,
        cancel_confirmed_at: null,
      })
      .eq('id', betId);

    if (error) throw error;
  }

  async confirmCancelBet(betId: string): Promise<void> {
    const user = await this.getUser();
    if (!user) throw new Error('Nicht eingeloggt.');

    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from('bets')
      .update({
        cancel_status: 'confirmed',
        cancel_confirmed_by: user.id,
        cancel_confirmed_at: now,
        status: 'cancelled',
      })
      .eq('id', betId);

    if (error) throw error;
  }

  async rejectCancelBet(betId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bets')
      .update({
        cancel_status: 'rejected',
        cancel_requested_by: null,
        cancel_requested_at: null,
        cancel_confirmed_by: null,
        cancel_confirmed_at: null,
      })
      .eq('id', betId);

    if (error) throw error;
  }

  async deleteBet(betId: string): Promise<void> {
    const { error: photosError } = await this.supabase
      .from('bet_photos')
      .delete()
      .eq('bet_id', betId);

    if (photosError) throw photosError;

    const { error } = await this.supabase
      .from('bets')
      .delete()
      .eq('id', betId);

    if (error) throw error;
  }

  // ----- Winner-Flow -----

  async proposeMeAsWinner(betId: string): Promise<void> {
    const user = await this.getUser();
    if (!user) throw new Error('Nicht eingeloggt.');

    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from('bets')
      .update({
        winner_id: user.id,
        winner_proposed_by: user.id,
        winner_status: 'proposed',
        winner_proposed_at: now,
      })
      .eq('id', betId);

    if (error) throw error;
  }

  async confirmWinner(
    betId: string,
    coords: { lat: number | null; lng: number | null }
  ): Promise<void> {
    const user = await this.getUser();
    if (!user) throw new Error('Nicht eingeloggt.');

    const now = new Date().toISOString();

    const { error } = await this.supabase
      .from('bets')
      .update({
        winner_status: 'confirmed',
        status: 'completed',
        completed_lat: coords.lat ?? null,
        completed_lng: coords.lng ?? null,
        winner_confirmed_at: now,
        winner_confirmed_by: user.id,
      })
      .eq('id', betId);

    if (error) throw error;
  }

  async rejectWinnerProposal(betId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bets')
      .update({
        winner_status: 'rejected',
        winner_id: null,
        winner_proposed_by: null,
        winner_proposed_at: null,
        winner_confirmed_at: null,
        winner_confirmed_by: null,
      })
      .eq('id', betId);

    if (error) throw error;
  }

  // ---------- Bet-Fotos ----------

  async listBetPhotos(betId: string): Promise<BetPhoto[]> {
    const { data, error } = await this.supabase
      .from('bet_photos')
      .select('*')
      .eq('bet_id', betId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as BetPhoto[];
  }

  async addBetPhoto(params: {
    betId: string;
    imageDataUrl: string;
    latitude: number | null;
    longitude: number | null;
  }): Promise<BetPhoto> {
    const user = await this.getUser();
    if (!user) throw new Error('Nicht eingeloggt.');

    const { data, error } = await this.supabase
      .from('bet_photos')
      .insert({
        bet_id: params.betId,
        user_id: user.id,
        photo_url: params.imageDataUrl,
        latitude: params.latitude,
        longitude: params.longitude,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as BetPhoto;
  }
}
