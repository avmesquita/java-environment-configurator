import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly navItems = [
    { path: '/', label: 'Visao Geral' },
    { path: '/project', label: 'Projeto' },
    { path: '/datasources', label: 'DataSources' },
    { path: '/profiles', label: 'Perfis' },
    { path: '/backups', label: 'Backups' },
    { path: '/settings', label: 'Configuracoes' }
  ];
}
