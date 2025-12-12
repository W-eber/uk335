import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonText,
  IonIcon,
  IonSpinner,
  IonBadge,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import {
  SupabaseService,
  Bet,
  BetPhoto,
  CancelStatus,
} from '../services/supabase.service';

interface BetEvent {
  type:
    | 'created'
    | 'photo'
    | 'winner-proposed'
    | 'winner-confirmed'
    | 'winner-rejected'
    | 'cancel-requested'
    | 'cancel-confirmed'
    | 'cancel-rejected';
  title: string;
  description: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
}

@Component({
  selector: 'app-bet-detail',
  templateUrl: './bet-detail.page.html',
  styleUrls: ['./bet-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonText,
    IonIcon,
    IonSpinner,
    IonBadge,
  ],
})
export class BetDetailPage implements OnInit {
  bet: Bet | null = null;
  photos: BetPhoto[] = [];
  events: BetEvent[] = [];

  loading = true;
  errorMessage = '';

  currentUserId: string | null = null;
  currentUsername: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadCurrentUser();

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Keine Wette gefunden.';
      this.loading = false;
      return;
    }

    await this.loadBetAndPhotos(id);
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

  private async loadBetAndPhotos(id: string) {
    this.loading = true;
    this.errorMessage = '';
    this.bet = null;
    this.photos = [];
    this.events = [];

    try {
      const bet = await this.supabaseService.getBetById(id);
      if (!bet) {
        this.errorMessage = 'Wette nicht gefunden.';
        return;
      }
      this.bet = bet;

      this.photos = await this.supabaseService.listBetPhotos(id);

      this.buildEvents();
    } catch (err) {
      console.error('Error loading bet detail', err);
      this.errorMessage = 'Fehler beim Laden der Wett-Details.';
    } finally {
      this.loading = false;
    }
  }

  private isOwner(): boolean {
    if (!this.bet || !this.currentUserId) return false;
    return this.bet.owner_id === this.currentUserId;
  }

  private isCancelRequestedByMe(): boolean {
    if (!this.bet || !this.currentUserId) return false;
    const cs = (this.bet.cancel_status ?? 'none') as CancelStatus;
    if (cs !== 'proposed') return false;
    return this.bet.cancel_requested_by === this.currentUserId;
  }

  private isCancelRequestedByOther(): boolean {
    if (!this.bet || !this.currentUserId) return false;
    const cs = (this.bet.cancel_status ?? 'none') as CancelStatus;
    if (cs !== 'proposed') return false;
    return (
      !!this.bet.cancel_requested_by &&
      this.bet.cancel_requested_by !== this.currentUserId
    );
  }

  getCancelStatusLabel(): string | null {
    if (!this.bet) return null;
    const cs = (this.bet.cancel_status ?? 'none') as CancelStatus;
    if (cs === 'none') return null;
    if (cs === 'proposed') {
      if (this.isCancelRequestedByMe()) {
        return 'Abbruch von dir angefragt';
      }
      if (this.isCancelRequestedByOther()) {
        return 'Abbruch vom Mitspieler angefragt';
      }
      return 'Abbruch angefragt';
    }
    if (cs === 'confirmed') {
      return 'Abbruch von beiden bestätigt';
    }
    if (cs === 'rejected') {
      return 'Abbruch abgelehnt';
    }
    return null;
  }

  private buildEvents() {
    if (!this.bet) return;

    const events: BetEvent[] = [];

    // Wette erstellt
    events.push({
      type: 'created',
      title: 'Wette erstellt',
      description: this.isOwner()
        ? 'Du hast diese Wette erstellt.'
        : 'Der Mitspieler hat diese Wette erstellt.',
      timestamp: this.bet.created_at,
      latitude: this.bet.created_lat ?? null,
      longitude: this.bet.created_lng ?? null,
    });

    // Fotos
    for (const photo of this.photos) {
      events.push({
        type: 'photo',
        title: 'Foto hinzugefügt',
        description:
          photo.user_id === this.currentUserId
            ? 'Du hast ein Foto hinzugefügt.'
            : 'Der Mitspieler hat ein Foto hinzugefügt.',
        timestamp: photo.created_at,
        latitude: photo.latitude ?? null,
        longitude: photo.longitude ?? null,
      });
    }

    // Winner-Events
    const winnerStatus = this.bet.winner_status ?? 'none';

    if (
      winnerStatus !== 'none' &&
      this.bet.winner_proposed_at &&
      this.bet.winner_proposed_by
    ) {
      events.push({
        type: 'winner-proposed',
        title: 'Gewinner vorgeschlagen',
        description:
          this.bet.winner_proposed_by === this.currentUserId
            ? 'Du hast dich als Gewinner eingetragen.'
            : 'Der Mitspieler hat sich als Gewinner eingetragen.',
        timestamp: this.bet.winner_proposed_at,
        latitude: null,
        longitude: null,
      });
    }

    if (
      winnerStatus === 'confirmed' &&
      this.bet.winner_confirmed_at &&
      this.bet.winner_confirmed_by
    ) {
      events.push({
        type: 'winner-confirmed',
        title: 'Gewinner bestätigt',
        description:
          this.bet.winner_confirmed_by === this.currentUserId
            ? 'Du hast den Gewinner bestätigt.'
            : 'Der Mitspieler hat den Gewinner bestätigt.',
        timestamp: this.bet.winner_confirmed_at,
        latitude: this.bet.completed_lat ?? null,
        longitude: this.bet.completed_lng ?? null,
      });
    }

    if (winnerStatus === 'rejected' && this.bet.winner_proposed_at) {
      events.push({
        type: 'winner-rejected',
        title: 'Gewinner-Vorschlag abgelehnt',
        description: 'Der Gewinner-Vorschlag wurde abgelehnt.',
        timestamp: this.bet.winner_proposed_at,
        latitude: null,
        longitude: null,
      });
    }

    // Cancel-Events
    const cancelStatus = (this.bet.cancel_status ?? 'none') as CancelStatus;

    if (
      cancelStatus !== 'none' &&
      this.bet.cancel_requested_at &&
      this.bet.cancel_requested_by
    ) {
      events.push({
        type: 'cancel-requested',
        title: 'Abbruch angefragt',
        description:
          this.bet.cancel_requested_by === this.currentUserId
            ? 'Du hast den Abbruch der Wette angefragt.'
            : 'Der Mitspieler hat den Abbruch der Wette angefragt.',
        timestamp: this.bet.cancel_requested_at,
        latitude: null,
        longitude: null,
      });
    }

    if (
      cancelStatus === 'confirmed' &&
      this.bet.cancel_confirmed_at &&
      this.bet.cancel_confirmed_by
    ) {
      events.push({
        type: 'cancel-confirmed',
        title: 'Abbruch bestätigt',
        description:
          this.bet.cancel_confirmed_by === this.currentUserId
            ? 'Du hast den Abbruch bestätigt.'
            : 'Der Mitspieler hat den Abbruch bestätigt.',
        timestamp: this.bet.cancel_confirmed_at,
        latitude: null,
        longitude: null,
      });
    }

    if (cancelStatus === 'rejected' && this.bet.cancel_requested_at) {
      events.push({
        type: 'cancel-rejected',
        title: 'Abbruch abgelehnt',
        description: 'Der Abbruch der Wette wurde abgelehnt.',
        timestamp: this.bet.cancel_requested_at,
        latitude: null,
        longitude: null,
      });
    }

    events.sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0
    );

    this.events = events;
  }

  formatLocation(ev: BetEvent): string {
    if (!ev.latitude || !ev.longitude) {
      return 'Keine Standortdaten gespeichert.';
    }
    return `Lat ${ev.latitude.toFixed(5)}, Lng ${ev.longitude.toFixed(5)}`;
  }
}
