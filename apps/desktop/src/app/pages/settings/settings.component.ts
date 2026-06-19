import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../core/electron.service';
import { SettingsView } from '../../core/electron-api.types';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  private readonly electron = inject(ElectronService);

  settingsView: SettingsView | null = null;
  error: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.electron.getSettings().then(
      (view: SettingsView) => {
        this.settingsView = view;
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }
}
