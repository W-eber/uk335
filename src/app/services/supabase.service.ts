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

export interface Profile {
  id: string;
  username: string;
  email?: string | null;
  is_adult: boolean;
  created_at: string;
}

export interface Bet {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  invited_username: string | null;
  stake_type: StakeType;
  stake_amount: number | null;
  stake_currency: string | null;
  stake_text: string | null;
  status: BetStatus;
  created_at: string;
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
    if (error) {
      throw error;
    }
    return data.session ?? null;
  }

  async signUp(email: string, password: string, username: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const user = data.user;
    if (!user) {
      throw new Error('Kein Benutzer nach Registrierung vorhanden.');
    }

    // Profil anlegen – inkl. E-Mail (für Username-Login)
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

    if (error) {
      throw error;
    }

    return data.user;
  }

  /**
   * Login mit E-Mail ODER Username im gleichen Feld.
   */
  async signInWithIdentifier(identifier: string, password: string) {
    const trimmed = identifier.trim();

    // Fall 1: E-Mail
    if (trimmed.includes('@')) {
      return this.signIn(trimmed, password);
    }

    // Fall 2: Username -> E-Mail aus profiles holen
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
      throw new Error('Für diesen Username ist keine E-Mail hinterlegt.');
    }

    return this.signIn(email, password);
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  async getUser(): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) {
      throw error;
    }
    return data.user ?? null;
  }

  // ---------- Profile ----------

  async getProfile(): Promise<Profile | null> {
    const user = await this.getUser();
    if (!user) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      throw error;
    }

    return data as Profile;
  }

  async searchProfilesByUsername(query: string): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, username, email, is_adult, created_at')
      .ilike('username', `${query}%`)
      .order('username')
      .limit(10);

    if (error) {
      throw error;
    }

    return (data ?? []) as Profile[];
  }

  // ---------- Bets: Lesen ----------

  async listBets(): Promise<Bet[]> {
    const { data, error } = await this.supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []) as Bet[];
  }

  // ---------- Bets: Erstellen ----------

  async createBet(payload: {
    title: string;
    description?: string | null;
    invitedUsername?: string | null;
    stakeType: StakeType;
    stakeAmount?: number | null;
    stakeCurrency?: string | null;
    stakeText?: string | null;
  }): Promise<Bet> {
    const { data: userData, error: userError } =
      await this.supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    const user = userData.user;
    if (!user) {
      throw new Error('Nicht eingeloggt.');
    }

    const { data, error } = await this.supabase
      .from('bets')
      .insert({
        owner_id: user.id,
        title: payload.title,
        description: payload.description ?? null,
        invited_username: payload.invitedUsername ?? null,
        stake_type: payload.stakeType,
        stake_amount:
          payload.stakeType === 'money' ? payload.stakeAmount ?? null : null,
        stake_currency:
          payload.stakeType === 'money'
            ? payload.stakeCurrency?.trim() || null
            : null,
        stake_text: payload.stakeText ?? null,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as Bet;
  }

  // ---------- Bets: Akzeptieren ----------

  async acceptBet(betId: string): Promise<void> {
    const { error } = await this.supabase
      .from('bets')
      .update({ status: 'accepted' })
      .eq('id', betId);

    if (error) {
      throw error;
    }
  }
}
