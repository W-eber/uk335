import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLabel,
} from '@ionic/angular/standalone';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonLabel,
  ],
})
export class AuthPage implements OnInit {
  mode: 'login' | 'register' = 'login';

  loginIdentifier = '';
  loginPassword = '';

  registerEmail = '';
  registerUsername = '';
  registerPassword = '';

  loading = false;
  errorMessage = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      const session = await this.supabaseService.getSession();
      if (session) {
        this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
      }
    } catch (err) {
      console.error('Error checking session', err);
    }
  }

  switchMode(mode: 'login' | 'register') {
    this.mode = mode;
    this.errorMessage = '';
  }

  private validateLogin(): boolean {
    const identifier = this.loginIdentifier.trim();

    if (!identifier || !this.loginPassword) {
      this.errorMessage = 'Bitte Benutzername/E-Mail und Passwort eingeben.';
      return false;
    }

    if (this.loginPassword.length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return false;
    }

    return true;
  }

  private validateRegister(): boolean {
    const email = this.registerEmail.trim();
    const username = this.registerUsername.trim();
    const password = this.registerPassword;

    if (!email || !username || !password) {
      this.errorMessage = 'Bitte alle Felder ausfüllen.';
      return false;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      this.errorMessage = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      return false;
    }

    if (username.length < 3) {
      this.errorMessage =
        'Der Benutzername muss mindestens 3 Zeichen lang sein.';
      return false;
    }

    if (password.length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return false;
    }

    return true;
  }

  async handleLogin() {
    if (this.loading) return;
    this.errorMessage = '';

    if (!this.validateLogin()) {
      return;
    }

    this.loading = true;
    try {
      await this.supabaseService.signInWithIdentifier(
        this.loginIdentifier.trim(),
        this.loginPassword
      );
      this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    } catch (err: any) {
      console.error('Login error', err);
      this.errorMessage =
        err?.message ?? 'Login fehlgeschlagen. Bitte Daten prüfen.';
    } finally {
      this.loading = false;
    }
  }

  async handleRegister() {
    if (this.loading) return;
    this.errorMessage = '';

    if (!this.validateRegister()) {
      return;
    }

    this.loading = true;
    try {
      await this.supabaseService.signUp(
        this.registerEmail.trim(),
        this.registerPassword,
        this.registerUsername.trim()
      );

      this.mode = 'login';
      this.loginIdentifier = this.registerEmail.trim();
      this.loginPassword = '';
      this.errorMessage =
        'Registrierung erfolgreich. Bitte jetzt mit E-Mail oder Username einloggen.';
    } catch (err: any) {
      console.error('Register error', err);
      this.errorMessage =
        err?.message ??
        'Registrierung fehlgeschlagen. Bitte Eingaben prüfen oder später erneut versuchen.';
    } finally {
      this.loading = false;
    }
  }
}
