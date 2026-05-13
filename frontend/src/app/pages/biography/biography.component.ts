import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-biography',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './biography.component.html',
  styleUrl: './biography.component.css'
})
export class BiographyComponent implements OnInit {
  private titleService = inject(Title);
  private meta         = inject(Meta);
  private document     = inject(DOCUMENT);

  exhibitionsExpanded = false;
  techniquesExpanded  = false;

  ngOnInit() {
    this.titleService.setTitle('Sanatçı Hakkında | Nilüfer Örel – Ressam, Bodrum & Milas');
    this.meta.updateTag({ name: 'description', content: 'Bodrum ve Milas\'ta yaşayan ressam Nilüfer Örel hakkında. Biyografi, sergiler ve sanatsal teknikler. Turkish painter based in Bodrum, Muğla.' });
    this.setCanonical('https://orelnilufer.com/about');
  }

  private setCanonical(url: string) {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
