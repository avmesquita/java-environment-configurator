import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../core/electron.service';
import type { DataSourceConfig, RootXmlConfig } from '@avm/core/types';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss'
})
export class EditorComponent implements OnInit {
  private readonly electron = inject(ElectronService);

  docBase = '';
  primary: DataSourceConfig | null = null;
  message: string | null = null;
  error: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error = null;
    this.electron.getConfig().then(
      (config: RootXmlConfig) => {
        this.docBase = config.docBase;
        const found = config.dataSources[0] ?? null;
        this.primary = found ? { ...found } : null;
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }

  saveDocBase(): void {
    this.message = null;
    this.error = null;
    this.electron.updateDocBase(this.docBase).then(
      (result) => {
        this.message = `docBase atualizado. Backup: ${result.backupPath}`;
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }

  savePrimary(): void {
    if (!this.primary) {
      return;
    }

    this.message = null;
    this.error = null;
    this.electron.updateDataSource(this.primary.name, this.primary).then(
      (result) => {
        this.message = `DataSource atualizado. Backup: ${result.backupPath}`;
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }
}
