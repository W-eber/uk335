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
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';
import { SupabaseService, Profile } from '../services/supabase.service';

interface RuleTemplate {
  key: string;
  title: string;
  text: string;
}

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
    IonSelect,
    IonSelectOption,
    IonSpinner,
  ],
})
export class Tab2Page {
  title = '';
  description = '';

  invitedSearch = '';
  invitedSuggestions: Profile[] = [];
  invitedSelectedUsername: string | null = null;

  stakeType: 'money' | 'other' = 'money';
  stakeAmount: number | null = null;
  stakeCurrency = '';
  stakeText = '';

  ruleTemplates: RuleTemplate[] = [
    {
      key: 'standard',
      title: 'Standard – private Kontaktdaten vorhanden',
      text: [
        '1. Beide Parteien bestätigen beim Akzeptieren dieser Wette, dass sie die privaten Kontaktdaten (Name, Zahlungsinformationen) der jeweils anderen Person ausserhalb der App besitzen.',
        '2. Die Auszahlung des vereinbarten Betrags oder die Erfüllung des Einsatzes erfolgt direkt zwischen den Parteien ohne Beteiligung von SetBet.',
        '3. SetBet dient ausschliesslich als neutrale Plattform zur Dokumentation der Abmachung (Zeitpunkt, Bedingungen, Status) und übernimmt keine Inkasso- oder Rechtsdienstleistungen.',
      ].join('\n'),
    },
    {
      key: 'money-strong',
      title: 'Geldwette – klare Zahlungspflicht',
      text: [
        '1. Beide Parteien verpflichten sich, im Falle einer Niederlage den vereinbarten Geldbetrag vollständig und ohne unnötige Verzögerung zu bezahlen.',
        '2. Die Parteien bestätigen, dass sie die nötigen Zahlungsinformationen der Gegenseite besitzen (z.B. IBAN, TWINT, PayPal o.ä.).',
        '3. Kommt eine Partei ihrer Zahlungsverpflichtung nicht nach, besteht der Anspruch der Gewinner-Partei weiter – auch ausserhalb der App und auf zivilrechtlichem Weg.',
        '4. SetBet dokumentiert nur die Abmachung und den Status, übernimmt aber keine Garantie für tatsächliche Zahlung oder Rechtsdurchsetzung.',
      ].join('\n'),
    },
    {
      key: 'honor',
      title: 'Ehrenwette – Challenge oder Handlung',
      text: [
        '1. Gegenstand der Wette ist primär eine Handlung oder Challenge (z.B. Aufgabe, Dienstleistung, öffentliches Einlösen einer Strafe).',
        '2. Beide Parteien bestätigen, dass sie die vereinbarte Handlung im Falle einer Niederlage ernst nehmen und nach bestem Wissen erfüllen.',
        '3. Allfällige Nebenabmachungen (z.B. kleiner Betrag, Essen ausgeben) werden im Beschreibungstext der Wette oder im Einsatz-Feld festgehalten.',
        '4. SetBet speichert die Abmachung und den Status, übernimmt aber keine Verantwortung dafür, ob die Handlung tatsächlich ausgeführt wird.',
      ].join('\n'),
    },
  ];

  selectedRuleKey: string = this.ruleTemplates[0].key;
  selectedRuleText: string = this.ruleTemplates[0].text;

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
    if (term.length < 2) return;

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

  onRuleTemplateChange(ev: any) {
    const key = ev.detail?.value ?? this.selectedRuleKey;
    const tpl = this.ruleTemplates.find((t) => t.key === key);
    if (tpl) {
      this.selectedRuleKey = tpl.key;
      this.selectedRuleText = tpl.text;
    }
  }

  async createBet() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.title.trim()) {
      this.errorMessage = 'Bitte einen Titel für die Wette angeben.';
      return;
    }

    const invitedTrimmed = this.invitedSearch.trim();
    if (!invitedTrimmed) {
      this.errorMessage = 'Bitte einen Mitspieler per Username auswählen.';
      return;
    }
    if (
      !this.invitedSelectedUsername ||
      this.invitedSelectedUsername !== invitedTrimmed
    ) {
      this.errorMessage =
        'Bitte einen existierenden Benutzer aus der Vorschlagsliste auswählen.';
      return;
    }
    const invitedUsername = this.invitedSelectedUsername;

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

    let createdLat: number | null = null;
    let createdLng: number | null = null;

    try {
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition();
      createdLat = pos.coords.latitude;
      createdLng = pos.coords.longitude;
    } catch (geoErr) {
      console.warn(
        'Geolocation beim Erstellen der Wette nicht verfügbar',
        geoErr
      );
    }

    try {
      await this.supabaseService.createBet({
        title: this.title.trim(),
        description: this.description.trim() || null,
        invitedUsername,
        stakeType: this.stakeType,
        stakeAmount: this.stakeType === 'money' ? this.stakeAmount : null,
        stakeCurrency:
          this.stakeType === 'money' ? this.stakeCurrency.trim() : null,
        stakeText:
          this.stakeType === 'other' ? this.stakeText.trim() : null,
        ruleTemplateKey: this.selectedRuleKey,
        rulesText: this.selectedRuleText,
        createdLat,
        createdLng,
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
    this.selectedRuleKey = this.ruleTemplates[0].key;
    this.selectedRuleText = this.ruleTemplates[0].text;
  }
}
