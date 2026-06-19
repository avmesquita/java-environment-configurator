import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../core/electron.service';
import type { ClientProfile, RootXmlConfig } from '@avm/core/types';

@Component({
  selector: 'app-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profiles.component.html',
  styleUrl: './profiles.component.scss'
})
export class ProfilesComponent implements OnInit {
  private readonly electron = inject(ElectronService);

  profiles = signal<ClientProfile[]>([]);
  config = signal<RootXmlConfig | null>(null);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  applying = signal<string | null>(null);

  applyDialogOpen = signal(false);
  selectedProfileCode = signal<string | null>(null);
  selectedDataSourceName = '';
  updateDialect = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error.set(null);
    this.electron.listProfiles().then(
      (profiles) => this.profiles.set(profiles),
      (err: Error) => this.error.set(err.message)
    );
    this.electron.getConfig().then(
      (config) => {
        this.config.set(config);
        if (config.dataSources.length > 0 && !this.selectedDataSourceName) {
          this.selectedDataSourceName = config.dataSources[0].name;
        }
      },
      (err: Error) => this.error.set(err.message)
    );
  }

  openApplyDialog(code: string): void {
    const config = this.config();
    if (!config || config.dataSources.length === 0) {
      this.error.set('Nenhum DataSource encontrado no ROOT.xml.');
      return;
    }

    this.selectedProfileCode.set(code);
    if (!config.dataSources.some((item) => item.name === this.selectedDataSourceName)) {
      this.selectedDataSourceName = config.dataSources[0].name;
    }
    this.updateDialect = false;
    this.applyDialogOpen.set(true);
  }

  closeApplyDialog(): void {
    this.applyDialogOpen.set(false);
    this.selectedProfileCode.set(null);
  }

  confirmApply(): void {
    const code = this.selectedProfileCode();
    const dataSourceName = this.selectedDataSourceName;
    if (!code || !dataSourceName) {
      return;
    }

    this.applying.set(code);
    this.message.set(null);
    this.error.set(null);
    this.applyDialogOpen.set(false);

    this.electron
      .applyProfile({
        code,
        dataSourceName,
        updateDialect: this.updateDialect
      })
      .then(
        (result) => {
          const dialectNote = result.dialectUpdated ? ' Dialect atualizado.' : '';
          this.message.set(
            `Perfil ${result.profileCode} aplicado em ${result.dataSourceName}.${dialectNote} Backup: ${result.backupPath}`
          );
          this.applying.set(null);
        },
        (err: Error) => {
          this.error.set(err.message);
          this.applying.set(null);
        }
      );
  }

  importProfiles(): void {
    if (!confirm('Importar perfis dos comentarios e da conexao ativa do ROOT.xml? Perfis existentes serao atualizados.')) {
      return;
    }

    this.message.set(null);
    this.error.set(null);

    this.electron.importProfiles().then(
      (result) => {
        this.message.set(`Importados ${result.imported} perfis do ROOT.xml`);
        this.load();
      },
      (err: Error) => {
        this.error.set(err.message);
      }
    );
  }
}
