import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../core/electron.service';
import type { DataSourceConfig, RootXmlConfig } from '@avm/core/types';

@Component({
  selector: 'app-datasources',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './datasources.component.html',
  styleUrl: './datasources.component.scss'
})
export class DatasourcesComponent implements OnInit {
  private readonly electron = inject(ElectronService);

  config: RootXmlConfig | null = null;
  drafts = new Map<string, DataSourceConfig>();
  message: string | null = null;
  error: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error = null;
    this.electron.getConfig().then(
      (config) => {
        this.config = config;
        this.drafts = new Map(config.dataSources.map((item) => [item.name, { ...item }]));
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }

  draft(name: string): DataSourceConfig | undefined {
    return this.drafts.get(name);
  }

  save(name: string): void {
    const resource = this.drafts.get(name);
    if (!resource) {
      return;
    }

    this.message = null;
    this.error = null;
    this.electron.updateDataSource(name, resource).then(
      (result) => {
        this.message = `${result.dataSourceName} salvo. Backup: ${result.backupPath}`;
        this.load();
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }
}
