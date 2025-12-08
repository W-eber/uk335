import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonRadioGroup,
  IonRadio,
  IonButton,
  IonText,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService, Profile } from '../services/supabase.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonRadioGroup,
    IonRadio,
    IonButton,
    IonText,
  ],
})
export class Tab2Page {
  title = '';
  description = '';

  // Username-Suche
  invitedSearch = '';
  invitedSuggestions: Profile[] = [];
  invitedSelectedUsername: string | null = null;

  // Einsatz
  stakeType: 'money' | 'other' = 'money';
  stakeAmount: number | null = null;
  stakeCurrency = '';
  stakeText = '';

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async onInvitedSearchChange(ev: any) {
    const value = ev.detail?.value ?? '';
    this.invitedSearch = value.toString();
    this.invitedSelectedUsername = null;
    this.invitedSuggestions = [];
    this.errorMessage = '';

    const term = this.invitedSearch.trim();
    if (term.length < 2) {
      return;
    }

    try {
      this.invitedSuggestions =
        await this.supabaseService.searchProfilesByUsername(term);
    } catch (err) {
      console.error('Error searching profiles', err);
    }
  }

  selectInvitedUser(p: Profile) {
    this.invitedSearch = p.username;
    this.invitedSelectedUsername = p.username;
    this.invitedSuggestions = [];
  }

  async createBet() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.title.trim()) {
      this.errorMessage = 'Bitte einen Titel für die Wette angeben.';
      return;
    }

    // Username muss gewählt sein, wenn etwas im Feld steht
    let invitedUsername: string | null = null;
    if (this.invitedSearch.trim()) {
      if (
        this.invitedSelectedUsername &&
        this.invitedSelectedUsername === this.invitedSearch.trim()
      ) {
        invitedUsername = this.invitedSelectedUsername;
      } else {
        this.errorMessage =
          'Bitte einen existierenden Benutzer aus der Liste auswählen.';
        return;
      }
    }

    if (this.stakeType === 'money') {
      if (!this.stakeAmount || this.stakeAmount <= 0) {
        this.errorMessage = 'Bitte einen gültigen Geldbetrag angeben.';
        return;
      }
      if (!this.stakeCurrency.trim()) {
        this.errorMessage = 'Bitte eine Währung angeben (z.B. CHF, EUR).';
        return;
      }
    }

    if (this.stakeType === 'other' && !this.stakeText.trim()) {
      this.errorMessage = 'Bitte den Einsatz/Verpflichtung beschreiben.';
      return;
    }

    this.loading = true;

    try {
      await this.supabaseService.createBet({
        title: this.title.trim(),
        description: this.description.trim() || null,
        invitedUsername,
        stakeType: this.stakeType,
        stakeAmount: this.stakeType === 'money' ? this.stakeAmount : null,
        stakeCurrency:
          this.stakeType === 'money'
            ? this.stakeCurrency.trim()
            : null,
        stakeText:
          this.stakeType === 'other' ? this.stakeText.trim() : null,
      });

      this.successMessage = 'Wette wurde erstellt.';
      this.resetForm();

      setTimeout(() => {
        this.router.navigateByUrl('/tabs/tab1');
      }, 600);
    } catch (err: any) {
      console.error('Error creating bet', err);
      this.errorMessage =
        err?.message ?? 'Fehler beim Erstellen der Wette.';
    } finally {
      this.loading = false;
    }
  }

  private resetForm() {
    this.title = '';
    this.description = '';
    this.invitedSearch = '';
    this.invitedSelectedUsername = null;
    this.invitedSuggestions = [];
    this.stakeType = 'money';
    this.stakeAmount = null;
    this.stakeCurrency = '';
    this.stakeText = '';
  }
}
