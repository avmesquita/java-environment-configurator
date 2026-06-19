import { Routes } from '@angular/router';
import { OverviewComponent } from './pages/overview/overview.component';
import { ProjectComponent } from './pages/project/project.component';
import { DatasourcesComponent } from './pages/datasources/datasources.component';
import { ProfilesComponent } from './pages/profiles/profiles.component';
import { BackupsComponent } from './pages/backups/backups.component';
import { SettingsComponent } from './pages/settings/settings.component';

export const routes: Routes = [
  { path: '', component: OverviewComponent },
  { path: 'project', component: ProjectComponent },
  { path: 'datasources', component: DatasourcesComponent },
  { path: 'profiles', component: ProfilesComponent },
  { path: 'backups', component: BackupsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'editor', redirectTo: 'project', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
