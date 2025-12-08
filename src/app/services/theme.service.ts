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

  async loadTheme() {
    const { value } = await Preferences.get({ key: THEME_KEY });
    this._isDark = value === 'true';
    document.body.classList.toggle('dark', this._isDark);
  }

  async setDarkMode(enabled: boolean) {
    this._isDark = enabled;
    document.body.classList.toggle('dark', enabled);
    await Preferences.set({
      key: THEME_KEY,
      value: enabled ? 'true' : 'false',
    });
  }

  async clearTheme() {
    this._isDark = false;
    document.body.classList.remove('dark');
    await Preferences.remove({ key: THEME_KEY });
  }
}
