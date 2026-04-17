import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaintingsAdminComponent } from './paintings-admin/paintings-admin.component';
import { ExhibitionsAdminComponent } from './exhibitions-admin/exhibitions-admin.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, PaintingsAdminComponent, ExhibitionsAdminComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  activeTab: 'paintings' | 'exhibitions' = 'paintings';
}
