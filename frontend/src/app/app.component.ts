import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './components/nav/nav.component';
import { FooterComponent } from './components/footer/footer.component';
import { I18nService } from './i18n/i18n.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, FooterComponent],
  template: `
    <app-nav></app-nav>
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>
  `,
  styles: [`main { min-height: calc(100vh - 200px); }`]
})
export class AppComponent {
  // Created before the first navigation so the page language is known
  // before any page component initialises.
  private i18n = inject(I18nService);
}
