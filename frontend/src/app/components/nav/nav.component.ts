import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { I18nService, LANGS, LANG_LABELS, Lang } from '../../i18n/i18n.service';
import { StringKey } from '../../i18n/strings';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent implements OnInit {
  auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly langs = LANGS;
  readonly labels = LANG_LABELS;
  readonly names: Record<Lang, string> = { en: 'English', tr: 'Türkçe', fr: 'Français' };
  scrolled = false;
  isAdmin = false;

  t(key: StringKey) { return this.i18n.t(key); }

  ngOnInit() {
    this.auth.isLoggedIn$.subscribe(val => (this.isAdmin = val));
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled = window.scrollY > 50;
  }
}
