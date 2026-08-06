import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { NotesStub } from '../features/notes/NotesStub';
import { ExperimentsStub } from '../features/experiments/ExperimentsStub';
import { SettingsHost } from '../features/settings/SettingsHost';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { NoteEditorSheet } from '../features/dashboard/sheets/NoteEditorSheet';
import { AiSheet } from '../features/dashboard/sheets/AiSheet';
import { NutritionSheet } from '../features/dashboard/sheets/NutritionSheet';
import { VersionSheet } from '../features/dashboard/sheets/VersionSheet';
import { ActivitySheet } from '../features/dashboard/sheets/ActivitySheet';
import { LongActingSheet } from '../features/dashboard/sheets/LongActingSheet';
import { ForecastSheet } from '../features/dashboard/sheets/ForecastSheet';
import { ScanSheet } from '../features/dashboard/sheets/ScanSheet';
import { BedsideScreen } from '../features/bedside/BedsideScreen';

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<DashboardScreen />}>
        <Route path="note/new" element={<NoteEditorSheet />} />
        <Route path="note/:id" element={<NoteEditorSheet />} />
        <Route path="ai" element={<AiSheet />} />
        <Route path="nutrition" element={<NutritionSheet />} />
        <Route path="version" element={<VersionSheet />} />
        <Route path="activity" element={<ActivitySheet />} />
        <Route path="long-acting" element={<LongActingSheet />} />
        <Route path="forecast" element={<ForecastSheet />} />
        <Route path="scan" element={<ScanSheet />} />
      </Route>
      <Route path="/notes" element={<NotesStub />} />
      <Route path="/experiments" element={<ExperimentsStub />} />
      <Route path="/settings" element={<SettingsHost />} />
    </Route>
    {/* Outside AppShell: full screen, no tab bar. */}
    <Route path="/bedside" element={<BedsideScreen />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);
