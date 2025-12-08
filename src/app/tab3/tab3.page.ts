import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class Tab3Page implements OnInit {
  isDarkMode = false;
  loading = true;
  userEmail = '';
  username = '';

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private themeService: ThemeService
  ) {}

  async ngOnInit() {
    // Theme laden
    await this.themeService.loadTheme();
    this.isDarkMode = this.themeService.isDark;

    // User + Profil laden
    try {
      const user = await this.supabaseService.getUser();
      this.userEmail = user?.email ?? '';

      const profile = await this.supabaseService.getProfile();
      this.username = profile?.username ?? '';
    } catch (err) {
      console.error('Error loading user/profile', err);
    }

    this.loading = false;
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
