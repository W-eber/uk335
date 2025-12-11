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
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Bet,
  BetPhoto,
  SupabaseService,
} from '../services/supabase.service';

interface BetEvent {
  type: 'created' | 'photo' | 'winner-proposed' | 'winner-confirmed';
  title: string;
  description: string;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  actor: string;
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

    try {
      const bet = await this.supabaseService.getBetById(id);
      if (!bet) {
        this.errorMessage = 'Diese Wette existiert nicht mehr.';
        this.loading = false;
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

  private buildEvents() {
    if (!this.bet) return;

    const events: BetEvent[] = [];

    events.push({
      type: 'created',
      title: 'Wette erstellt',
      description: 'Die Wette wurde angelegt.',
      timestamp: this.bet.created_at,
      latitude: this.bet.created_lat ?? null,
      longitude: this.bet.created_lng ?? null,
      actor:
        this.bet.owner_id === this.currentUserId
          ? 'Du (Ersteller)'
          : 'Ersteller',
    });

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
        actor:
          photo.user_id === this.currentUserId
            ? 'Du'
            : 'Mitspieler',
      });
    }

    if (
      this.bet.winner_status &&
      this.bet.winner_status !== 'none' &&
      this.bet.winner_proposed_at
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
        actor:
          this.bet.winner_proposed_by === this.currentUserId
            ? 'Du'
            : 'Mitspieler',
      });
    }

    if (this.bet.winner_status === 'confirmed' && this.bet.winner_confirmed_at) {
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
        actor:
          this.bet.winner_confirmed_by === this.currentUserId
            ? 'Du'
            : 'Mitspieler',
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
