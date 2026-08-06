import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { NotesStub } from '../features/notes/NotesStub';
import { ExperimentsStub } from '../features/experiments/ExperimentsStub';
import { SettingsHost } from '../features/settings/SettingsHost';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<DashboardScreen />} />
      <Route path="/notes" element={<NotesStub />} />
      <Route path="/experiments" element={<ExperimentsStub />} />
      <Route path="/settings" element={<SettingsHost />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);
