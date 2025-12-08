import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class AuthPage implements OnInit {
  mode: 'login' | 'register' = 'login';

  // Login
  loginIdentifier = ''; // E-Mail ODER Username
  loginPassword = '';

  // Registration
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
    // Wenn schon eingeloggt -> direkt aufs Dashboard
    try {
      const session = await this.supabaseService.getSession();
      if (session) {
        this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
      }
    } catch (err) {
      console.error('Error getting session', err);
    }
  }

  setMode(mode: 'login' | 'register') {
    this.mode = mode;
    this.errorMessage = '';
  }

  async onSubmit() {
    this.errorMessage = '';
    this.loading = true;

    try {
      if (this.mode === 'login') {
        if (!this.loginIdentifier.trim() || !this.loginPassword) {
          this.errorMessage =
            'Bitte Identifier (E-Mail oder Username) und Passwort eingeben.';
          return;
        }

        await this.supabaseService.signInWithIdentifier(
          this.loginIdentifier.trim(),
          this.loginPassword
        );
      } else {
        if (
          !this.registerEmail.trim() ||
          !this.registerUsername.trim() ||
          !this.registerPassword
        ) {
          this.errorMessage =
            'Bitte E-Mail, Username und Passwort für die Registrierung eingeben.';
          return;
        }

        await this.supabaseService.signUp(
          this.registerEmail.trim(),
          this.registerPassword,
          this.registerUsername.trim()
        );
      }

      this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
    } catch (err: any) {
      console.error('Auth error', err);
      this.errorMessage =
        err?.message ?? 'Fehler bei der Anmeldung oder Registrierung.';
    } finally {
      this.loading = false;
    }
  }
}
