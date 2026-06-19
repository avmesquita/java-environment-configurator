import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../core/electron.service';
import type { BackupContentView, RootXmlBackup } from '@avm/core/types';

@Component({
  selector: 'app-backups',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './backups.component.html',
  styleUrl: './backups.component.scss'
})
export class BackupsComponent implements OnInit {
  private readonly electron = inject(ElectronService);

  backups: RootXmlBackup[] = [];
  message: string | null = null;
  error: string | null = null;
  viewing: BackupContentView | null = null;
  loadingContent = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.electron.listBackups().then(
      (backups) => {
        this.backups = backups;
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }

  createBackup(): void {
    this.message = null;
    this.error = null;
    this.electron.createBackup().then(
      (backup) => {
        this.message = `Backup criado: ${backup.backupPath}`;
        this.load();
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }

  viewContent(backupId: number): void {
    this.message = null;
    this.error = null;
    this.loadingContent = true;
    this.electron.getBackupContent(backupId).then(
      (content) => {
        this.viewing = content;
        this.loadingContent = false;
      },
      (err: Error) => {
        this.error = err.message;
        this.loadingContent = false;
      }
    );
  }

  closeViewer(): void {
    this.viewing = null;
  }

  restore(backupId: number): void {
    if (!confirm('Restaurar este backup? Um novo backup do estado atual sera criado antes.')) {
      return;
    }

    this.message = null;
    this.error = null;
    this.electron.restoreBackup(backupId).then(
      (path) => {
        this.message = `Backup restaurado em ${path}`;
        this.load();
      },
      (err: Error) => {
        this.error = err.message;
      }
    );
  }
}
