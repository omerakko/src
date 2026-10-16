import { Component, HostListener, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  private router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly langs = LANGS;
  readonly labels = LANG_LABELS;
  readonly names: Record<Lang, string> = { en: 'English', tr: 'Türkçe', fr: 'Français' };
  scrolled = false;
  isAdmin = false;

  /** Phone menu panel (links + languages). */
  menuOpen = false;
  /** Phones: the bar slides away while scrolling down, returns on scroll up. */
  hidden = false;
  private lastY = 0;

  t(key: StringKey) { return this.i18n.t(key); }

  ngOnInit() {
    this.auth.isLoggedIn$.subscribe(val => (this.isAdmin = val));
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) { this.menuOpen = false; this.hidden = false; }
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) this.hidden = false;
  }

  @HostListener('window:scroll')
  onScroll() {
    const y = window.scrollY;
    this.scrolled = y > 50;
    if (!this.menuOpen) {
      // Ignore tiny jitters; never hide near the top of the page.
      if (y > this.lastY + 6 && y > 80) this.hidden = true;
      else if (y < this.lastY - 6 || y <= 80) this.hidden = false;
    }
    this.lastY = y;
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.menuOpen = false; }
}
