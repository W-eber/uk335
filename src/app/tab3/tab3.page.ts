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
  IonToggle,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
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
    IonToggle,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
  ],
})
export class Tab3Page implements OnInit {
  isDarkMode = false;
  username: string | null = null;
  userEmail: string | null = null;
  loading = true;

  constructor(
    private supabaseService: SupabaseService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.loading = true;
    try {
      const enabled = await this.themeService.loadTheme();
      this.isDarkMode = enabled;

      const profile = await this.supabaseService.getProfile();
      this.username = profile?.username ?? null;
      this.userEmail = profile?.email ?? null;
    } catch (err) {
      console.error('Error loading settings', err);
    } finally {
      this.loading = false;
    }
  }

  async onDarkModeToggle() {
    await this.themeService.setDarkMode(this.isDarkMode);
  }

  async logout() {
    try {
      await this.supabaseService.signOut();
    } catch (err) {
      console.error('Error signing out', err);
    }

    await this.themeService.clearTheme();
    this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
