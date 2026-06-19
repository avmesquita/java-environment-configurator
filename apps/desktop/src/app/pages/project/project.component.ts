import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../core/electron.service';
import type { DocBaseHistoryEntry } from '@avm/core/types';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss'
})
export class ProjectComponent implements OnInit {
  private readonly electron = inject(ElectronService);

  currentDocBase = '';
  draftDocBase = '';
  history: DocBaseHistoryEntry[] = [];
  message: string | null = null;
  error: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error = null;
    this.electron.getConfig().then(
      (config) => {
        this.currentDocBase = config.docBase;
        this.draftDocBase = config.docBase;
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
    this.electron.listDocBaseHistory().then(
      (history) => {
        this.history = history;
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }

  saveDocBase(): void {
    this.message = null;
    this.error = null;
    this.electron.updateDocBase(this.draftDocBase).then(
      (result) => {
        this.currentDocBase = result.docBase;
        this.message = `docBase salvo. Backup: ${result.backupPath}`;
        this.load();
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }

  activateHistory(docBase: string): void {
    this.message = null;
    this.error = null;
    this.electron.activateDocBase(docBase).then(
      (result) => {
        this.currentDocBase = result.docBase;
        this.draftDocBase = result.docBase;
        this.message = `docBase ativado: ${result.docBase}`;
        this.load();
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }
}
