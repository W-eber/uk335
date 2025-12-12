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
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import {
  SupabaseService,
  Bet,
  BetPhoto,
  CancelStatus,
} from '../services/supabase.service';

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
  betPhotos: Record<string, BetPhoto[]> = {};
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
    this.betPhotos = {};

    try {
      this.bets = await this.supabaseService.listBets();

      for (const bet of this.bets) {
        try {
          const photos = await this.supabaseService.listBetPhotos(bet.id);
          this.betPhotos[bet.id] = photos;
        } catch (photoErr) {
          console.warn('Fehler beim Laden der Fotos für Bet', bet.id, photoErr);
        }
      }
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

  isParticipant(bet: Bet): boolean {
    if (!this.currentUserId || !this.currentUsername) return false;
    const isOwner = bet.owner_id === this.currentUserId;
    const isInvited = bet.invited_username === this.currentUsername;
    return isOwner || isInvited;
  }

  isInvitedPending(bet: Bet): boolean {
    if (bet.status !== 'open') return false;
    if (!this.currentUsername) return false;
    return bet.invited_username === this.currentUsername;
  }

  private getCancelStatus(bet: Bet): CancelStatus {
    return (bet.cancel_status ?? 'none') as CancelStatus;
  }

  canProposeWinner(bet: Bet): boolean {
    if (!this.isParticipant(bet)) return false;
    if (bet.status !== 'accepted') return false;
    const ws = bet.winner_status ?? 'none';
    return ws === 'none' || ws === 'rejected';
  }

  canConfirmWinner(bet: Bet): boolean {
    if (!this.isParticipant(bet)) return false;
    if (bet.status !== 'accepted') return false;
    const ws = bet.winner_status ?? 'none';
    if (ws !== 'proposed') return false;
    if (!this.currentUserId) return false;
    return bet.winner_proposed_by !== this.currentUserId;
  }

  canRejectWinner(bet: Bet): boolean {
    return this.canConfirmWinner(bet);
  }

  canRequestCancel(bet: Bet): boolean {
    if (!this.isParticipant(bet)) return false;
    if (bet.status === 'completed' || bet.status === 'cancelled') return false;
    const ws = bet.winner_status ?? 'none';
    if (ws === 'confirmed') return false;

    const cs = this.getCancelStatus(bet);
    return cs === 'none' || cs === 'rejected';
  }

  isCancelRequestedByMe(bet: Bet): boolean {
    const cs = this.getCancelStatus(bet);
    if (cs !== 'proposed') return false;
    if (!this.currentUserId) return false;
    return bet.cancel_requested_by === this.currentUserId;
  }

  canRespondToCancel(bet: Bet): boolean {
    const cs = this.getCancelStatus(bet);
    if (cs !== 'proposed') return false;
    if (!this.isParticipant(bet)) return false;
    if (!this.currentUserId) return false;
    return bet.cancel_requested_by !== this.currentUserId;
  }

  canDeleteBet(bet: Bet): boolean {
    if (!this.isMyBet(bet)) return false;
    return bet.status === 'cancelled';
  }

  async acceptBet(bet: Bet) {
    try {
      await this.supabaseService.acceptBet(bet.id);
      bet.status = 'accepted';
    } catch (err) {
      console.error('Error accepting bet', err);
      alert('Fehler beim Akzeptieren der Wette.');
    }
  }

  async proposeMeAsWinner(bet: Bet) {
    try {
      await this.supabaseService.proposeMeAsWinner(bet.id);
      bet.winner_status = 'proposed';
      bet.winner_id = this.currentUserId;
      bet.winner_proposed_by = this.currentUserId;
      bet.winner_proposed_at = new Date().toISOString();
    } catch (err) {
      console.error('Error proposing winner', err);
      alert('Fehler beim Eintragen als Gewinner.');
    }
  }

  async confirmWinner(bet: Bet) {
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition();
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (geoErr) {
      console.warn(
        'Geolocation beim Abschliessen der Wette nicht verfügbar',
        geoErr
      );
    }

    try {
      await this.supabaseService.confirmWinner(bet.id, { lat, lng });
      bet.winner_status = 'confirmed';
      bet.status = 'completed';
      bet.completed_lat = lat;
      bet.completed_lng = lng;
      bet.winner_confirmed_at = new Date().toISOString();
      bet.winner_confirmed_by = this.currentUserId ?? null;
    } catch (err) {
      console.error('Error confirming winner', err);
      alert('Fehler beim Bestätigen des Gewinners.');
    }
  }

  async rejectWinner(bet: Bet) {
    try {
      await this.supabaseService.rejectWinnerProposal(bet.id);
      bet.winner_status = 'rejected';
      bet.winner_id = null;
      bet.winner_proposed_by = null;
      bet.winner_proposed_at = null;
      bet.winner_confirmed_at = null;
      bet.winner_confirmed_by = null;
    } catch (err) {
      console.error('Error rejecting winner', err);
      alert('Fehler beim Ablehnen des Gewinner-Vorschlags.');
    }
  }

  async requestCancel(bet: Bet) {
    if (!this.canRequestCancel(bet)) return;

    const confirmed = confirm(
      'Möchtest du den Abbruch dieser Wette anfragen? Die andere Partei muss zustimmen.'
    );
    if (!confirmed) return;

    try {
      await this.supabaseService.requestCancelBet(bet.id);
      bet.cancel_status = 'proposed';
      bet.cancel_requested_by = this.currentUserId;
      bet.cancel_requested_at = new Date().toISOString();
      bet.cancel_confirmed_by = null;
      bet.cancel_confirmed_at = null;
    } catch (err) {
      console.error('Error requesting cancel', err);
      alert('Fehler beim Anfragen des Abbruchs.');
    }
  }

  async confirmCancel(bet: Bet) {
    if (!this.canRespondToCancel(bet)) return;

    const yes = confirm(
      'Möchtest du den Abbruch dieser Wette bestätigen? Die Wette gilt dann als abgebrochen.'
    );
    if (!yes) return;

    try {
      await this.supabaseService.confirmCancelBet(bet.id);
      bet.cancel_status = 'confirmed';
      bet.cancel_confirmed_by = this.currentUserId;
      bet.cancel_confirmed_at = new Date().toISOString();
      bet.status = 'cancelled';
    } catch (err) {
      console.error('Error confirming cancel', err);
      alert('Fehler beim Bestätigen des Abbruchs.');
    }
  }

  async rejectCancel(bet: Bet) {
    if (!this.canRespondToCancel(bet)) return;

    const yes = confirm(
      'Möchtest du den Abbruch ablehnen? Die Wette bleibt dann bestehen.'
    );
    if (!yes) return;

    try {
      await this.supabaseService.rejectCancelBet(bet.id);
      bet.cancel_status = 'rejected';
      bet.cancel_requested_by = null;
      bet.cancel_requested_at = null;
      bet.cancel_confirmed_by = null;
      bet.cancel_confirmed_at = null;
    } catch (err) {
      console.error('Error rejecting cancel', err);
      alert('Fehler beim Ablehnen des Abbruchs.');
    }
  }

  async deleteBet(bet: Bet) {
    if (!this.canDeleteBet(bet)) return;

    const confirmed = confirm(
      'Willst du diese abgebrochene Wette endgültig löschen? Dieser Schritt kann nicht rückgängig gemacht werden.'
    );
    if (!confirmed) return;

    try {
      await this.supabaseService.deleteBet(bet.id);
      this.bets = this.bets.filter((b) => b.id !== bet.id);
      delete this.betPhotos[bet.id];
    } catch (err) {
      console.error('Error deleting bet', err);
      alert('Fehler beim Löschen der Wette.');
    }
  }

  goToCreateBet() {
    this.router.navigateByUrl('/tabs/tab2');
  }

  goToBetDetail(bet: Bet) {
    this.router.navigate(['/bet', bet.id]);
  }

  async addPhoto(bet: Bet) {
    if (!this.isParticipant(bet)) return;

    try {
      const perm = await Camera.requestPermissions();
      if (perm.camera !== 'granted') {
        alert(
          'Die Kamera-Berechtigung wurde nicht erteilt. Bitte in den App-Einstellungen freigeben.'
        );
        return;
      }
    } catch (permErr) {
      console.error('Fehler beim Abfragen der Kamera-Berechtigung', permErr);
    }

    let photoDataUrl: string | null = null;

    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 70,
      });

      if (!photo.dataUrl) return;
      photoDataUrl = photo.dataUrl;
    } catch (camErr) {
      console.error('Fehler bei Kamera-Aufnahme', camErr);
      alert('Kamera konnte nicht gestartet werden.');
      return;
    }

    let lat: number | null = null;
    let lng: number | null = null;

    try {
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition();
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (geoErr) {
      console.warn(
        'Geolocation beim Erstellen eines Fotos nicht verfügbar',
        geoErr
      );
    }

    try {
      const created = await this.supabaseService.addBetPhoto({
        betId: bet.id,
        imageDataUrl: photoDataUrl,
        latitude: lat,
        longitude: lng,
      });

      if (!this.betPhotos[bet.id]) {
        this.betPhotos[bet.id] = [];
      }
      this.betPhotos[bet.id].push(created);
    } catch (err) {
      console.error('Fehler beim Speichern des Fotos', err);
      alert('Foto konnte nicht gespeichert werden.');
    }
  }

  getPhotosForBet(bet: Bet): BetPhoto[] {
    return this.betPhotos[bet.id] ?? [];
  }

  hasGeoOnCreate(bet: Bet): boolean {
    return !!bet.created_lat && !!bet.created_lng;
  }

  hasGeoOnCompletion(bet: Bet): boolean {
    return !!bet.completed_lat && !!bet.completed_lng;
  }
}
