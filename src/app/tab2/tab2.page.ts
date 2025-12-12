import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonText,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import {
  SupabaseService,
  StakeType,
  Profile,
} from '../services/supabase.service';

interface RuleTemplate {
  key: string;
  title: string;
  text: string;
}

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonText,
    IonSelect,
    IonSelectOption,
  ],
})
export class Tab2Page implements OnInit {
  title = '';
  description = '';
  invitedSearch = '';
  invitedSuggestions: Profile[] = [];

  stakeType: StakeType = null;
  stakeAmount: number | null = null;
  stakeCurrency = '';
  stakeText = '';

  ruleTemplates: RuleTemplate[] = [];
  selectedRuleKey = '';
  selectedRuleText = '';

  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit() {
    this.ruleTemplates = [
      {
        key: 'standard',
        title: 'Standard – private Wette mit Volljährigkeit',
        text: [
          '1. Beide Parteien bestätigen, zum Zeitpunkt der Wette volljährig zu sein und die Wette aus freien Stücken einzugehen.',
          '2. Die Parteien verfügen gegenseitig über Kontaktmöglichkeiten ausserhalb der App (z.B. Telefonnummer, Messenger, E-Mail).',
          '3. Der Einsatz wird fällig, sobald der Gewinner in der App bestätigt wurde. Die Abwicklung des Einsatzes erfolgt direkt zwischen den Parteien.',
          '4. SetBet stellt nur die Dokumentation der Wette (Bedingungen, Fotos, Zeitpunkte) bereit und übernimmt keine Rechtsberatung oder Inkasso.',
        ].join('\n'),
      },
      {
        key: 'money-strong',
        title: 'Geldwette – klare Zahlungspflicht',
        text: [
          '1. Der Einsatz besteht aus einem konkret vereinbarten Geldbetrag in einer definierten Währung.',
          '2. Die unterlegene Partei verpflichtet sich, den Einsatz innert angemessener Frist nach Bestätigung des Gewinners zu bezahlen.',
          '3. Können sich die Parteien über die Zahlungsart nicht einigen, wird eine übliche und zumutbare Zahlungsmethode verwendet (z.B. Banküberweisung, Twint, Bargeld).',
          '4. Die App kann im Streitfall als Nachweis für die getroffenen Abmachungen dienen, ersetzt jedoch keine rechtliche Beratung.',
        ].join('\n'),
      },
      {
        key: 'challenge',
        title: 'Challenge / Alltag – mit Foto-Nachweisen',
        text: [
          '1. Die Wette bezieht sich auf eine Challenge im Alltag (z.B. Sportleistung, Projektabschluss, Alltagsaufgabe).',
          '2. Vor und nach der Challenge sollen möglichst Fotos als Beweis hochgeladen werden, damit der Verlauf nachvollziehbar bleibt.',
          '3. Kommt es zu Uneinigkeit über das Ergebnis, einigen sich die Parteien nach Möglichkeit gütlich unter Berücksichtigung der in der App gespeicherten Fotos und Daten.',
          '4. Die Wette darf keine gefährlichen oder illegalen Handlungen verlangen. Jede Partei bleibt selbst verantwortlich für ihr Verhalten.',
        ].join('\n'),
      },
    ];

    if (this.ruleTemplates.length > 0) {
      this.selectedRuleKey = this.ruleTemplates[0].key;
      this.selectedRuleText = this.ruleTemplates[0].text;
    }
  }

  onRuleTemplateChange(event: any) {
    const key = event.detail?.value ?? '';
    this.selectedRuleKey = key;
    const tpl = this.ruleTemplates.find((t) => t.key === key);
    this.selectedRuleText = tpl ? tpl.text : '';
  }

  async onInvitedSearchChange(event: any) {
    const value = event.detail?.value ?? '';
    this.invitedSearch = value;
    this.invitedSuggestions = [];

    const trimmed = value.replace(/^@/, '').trim();
    if (!trimmed) {
      return;
    }

    try {
      this.invitedSuggestions =
        await this.supabaseService.searchProfilesByUsername(trimmed);
    } catch (err) {
      console.error('Fehler bei der Profilsuche', err);
    }
  }

  selectInvitedUser(profile: Profile) {
    this.invitedSearch = `@${profile.username}`;
    this.invitedSuggestions = [];
  }

  private validateForm(): boolean {
    const title = this.title.trim();
    const stakeType = this.stakeType;

    if (!title) {
      this.errorMessage = 'Bitte einen Titel für die Wette eingeben.';
      return false;
    }

    if (!stakeType) {
      this.errorMessage = 'Bitte eine Art des Einsatzes auswählen.';
      return false;
    }

    if (stakeType === 'money') {
      if (this.stakeAmount === null || this.stakeAmount <= 0) {
        this.errorMessage = 'Bitte einen gültigen Geldbetrag eingeben.';
        return false;
      }
      if (!this.stakeCurrency.trim()) {
        this.errorMessage = 'Bitte eine Währung für den Einsatz angeben.';
        return false;
      }
    }

    if (stakeType === 'other') {
      if (!this.stakeText.trim()) {
        this.errorMessage =
          'Bitte den Einsatz / die Verpflichtung in eigenen Worten beschreiben.';
        return false;
      }
    }

    if (!this.selectedRuleKey) {
      this.errorMessage = 'Bitte ein Regel-Template auswählen.';
      return false;
    }

    this.errorMessage = '';
    return true;
  }

  async createBet() {
    if (this.loading) return;

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateForm()) {
      return;
    }

    this.loading = true;

    let lat: number | null = null;
    let lng: number | null = null;

    try {
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition();
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (geoErr) {
      console.warn(
        'Geolocation beim Erstellen der Wette nicht verfügbar',
        geoErr
      );
    }

    try {
      const invitedUsername = this.invitedSearch.replace(/^@/, '').trim();

      await this.supabaseService.createBet({
        title: this.title.trim(),
        description: this.description.trim() || null,
        invitedUsername: invitedUsername || null,
        stakeType: this.stakeType,
        stakeAmount: this.stakeType === 'money' ? this.stakeAmount : null,
        stakeCurrency:
          this.stakeType === 'money'
            ? this.stakeCurrency.trim() || null
            : null,
        stakeText:
          this.stakeType === 'other'
            ? this.stakeText.trim() || null
            : null,
        ruleTemplateKey: this.selectedRuleKey,
        rulesText: this.selectedRuleText,
        createdLat: lat,
        createdLng: lng,
      });

      this.title = '';
      this.description = '';
      this.invitedSearch = '';
      this.invitedSuggestions = [];
      this.stakeType = null;
      this.stakeAmount = null;
      this.stakeCurrency = '';
      this.stakeText = '';
      if (this.ruleTemplates.length > 0) {
        this.selectedRuleKey = this.ruleTemplates[0].key;
        this.selectedRuleText = this.ruleTemplates[0].text;
      } else {
        this.selectedRuleKey = '';
        this.selectedRuleText = '';
      }

      this.successMessage = 'Wette wurde gespeichert.';
    } catch (err: any) {
      console.error('Fehler beim Erstellen der Wette', err);
      this.errorMessage =
        err?.message ??
        'Wette konnte nicht gespeichert werden. Bitte später erneut versuchen.';
    } finally {
      this.loading = false;
    }
  }
}
