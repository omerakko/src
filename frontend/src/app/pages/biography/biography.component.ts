import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-biography',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './biography.component.html',
  styleUrl: './biography.component.css'
})
export class BiographyComponent implements OnInit {
  private seo = inject(SeoService);

  exhibitionsExpanded = false;
  techniquesExpanded  = false;

  ngOnInit() {
    this.seo.setPage({
      title: 'About Nilüfer Örel – Turkish Painter Based in Bodrum | Biyografi',
      description: 'Biography and artist statement of Nilüfer Örel, Turkish contemporary painter living in Bodrum, Muğla. Studied with Şeref Bigalı, worked in Bucharest, exhibits in Türkiye and abroad. Ressam Nilüfer Örel hakkında: biyografi, sergiler ve teknikler.',
      path: '/about',
      image: '/assets/images/artistPhoto.jpg',
      type: 'profile'
    });
    this.seo.setBreadcrumbs([{ name: 'About', path: '/about' }]);
  }
}
