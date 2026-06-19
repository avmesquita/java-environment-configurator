import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ElectronService } from '../../core/electron.service';
import type { RootXmlConfig } from '@avm/core/types';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  private readonly electron = inject(ElectronService);

  config = signal<RootXmlConfig | null>(null);
  error = signal<string | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.electron.getConfig().then(
      (config: RootXmlConfig) => {
        this.config.set(config);
        this.loading.set(false);
      },
      (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    );
  }
}
