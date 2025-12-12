import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const THEME_KEY = 'darkMode';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private _isDark = false;

  get isDark() {
    return this._isDark;
  }

  async loadTheme(): Promise<boolean> {
    try {
      const { value } = await Preferences.get({ key: THEME_KEY });
      const enabled = value === 'true';
      this._isDark = enabled;
      document.body.classList.toggle('dark', enabled);
      return enabled;
    } catch (err) {
      console.error('Error loading theme from Preferences', err);
      this._isDark = false;
      document.body.classList.remove('dark');
      return false;
    }
  }

  async setDarkMode(enabled: boolean): Promise<void> {
    this._isDark = enabled;
    document.body.classList.toggle('dark', enabled);
    try {
      await Preferences.set({
        key: THEME_KEY,
        value: enabled ? 'true' : 'false',
      });
    } catch (err) {
      console.error('Error saving theme to Preferences', err);
    }
  }

  async clearTheme(): Promise<void> {
    this._isDark = false;
    document.body.classList.remove('dark');
    try {
      await Preferences.remove({ key: THEME_KEY });
    } catch (err) {
      console.error('Error clearing theme from Preferences', err);
    }
  }
}
