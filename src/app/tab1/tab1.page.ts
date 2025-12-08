import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonBadge,
  IonSpinner,
  IonText,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { SupabaseService, Bet } from '../services/supabase.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonBadge,
    IonSpinner,
    IonText,
    IonIcon,
    IonButton,
  ],
})
export class Tab1Page implements OnInit {
  bets: Bet[] = [];
  loading = true;
  errorMessage = '';
  currentUserId: string | null = null;
  currentUsername: string | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadCurrentUser();
    await this.loadBets();
  }

  private async loadCurrentUser() {
    try {
      const user = await this.supabaseService.getUser();
      this.currentUserId = user?.id ?? null;

      const profile = await this.supabaseService.getProfile();
      this.currentUsername = profile?.username ?? null;
    } catch (err) {
      console.error('Error loading user/profile', err);
    }
  }

  async loadBets() {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.bets = await this.supabaseService.listBets();
    } catch (err: any) {
      console.error('Error loading bets', err);
      this.errorMessage = err?.message ?? 'Fehler beim Laden der Wetten.';
    } finally {
      this.loading = false;
    }
  }

  async handleRefresh(event: CustomEvent) {
    try {
      await this.loadBets();
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  isMyBet(bet: Bet): boolean {
    return !!this.currentUserId && bet.owner_id === this.currentUserId;
  }

  isInvitedPending(bet: Bet): boolean {
    if (bet.status !== 'open') {
      return false;
    }

    if (!this.currentUsername) {
      return false;
    }

    return bet.invited_username === this.currentUsername;
  }

  async acceptBet(bet: Bet) {
    try {
      await this.supabaseService.acceptBet(bet.id);
      bet.status = 'accepted';
    } catch (err) {
      console.error('Error accepting bet', err);
    }
  }

  goToCreateBet() {
    this.router.navigateByUrl('/tabs/tab2');
  }
}
