import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CapsuleToolbar } from '../../app/shell/CapsuleToolbar';
import { SheetOutlet } from '../../app/shell/SheetOutlet';
import { useGlucose } from '../../state/GlucoseStore';
import { IsfSuggestionCard } from './cards/IsfSuggestionCard';
import { CompactGlucoseCard } from './cards/CompactGlucoseCard';
import { ForecastChartCard } from './cards/ForecastChartCard';
import { RecentNotesCard } from './cards/RecentNotesCard';
import { SensorAlarmsCard } from './cards/SensorAlarmsCard';
import { QuickActions } from './cards/QuickActions';

export const DashboardScreen: React.FC = () => {
  const { refreshAll, isLoading, errorMessage } = useGlucose();
  const navigate = useNavigate();

  return (
    <>
      <CapsuleToolbar
        actions={[
          {
            key: 'refresh',
            label: 'Refresh',
            icon: '↻',
            onClick: () => void refreshAll(),
            disabled: isLoading,
          },
          {
            key: 'bedside',
            label: 'Bedside mode',
            icon: '☾',
            onClick: () => navigate('/bedside'),
          },
          {
            key: 'add',
            label: 'Add note',
            icon: '＋',
            onClick: () => navigate('/dashboard/note/new'),
          },
        ]}
      />
      <div className="flex flex-col gap-3.5 px-3.5 pt-[72px]">
        <IsfSuggestionCard />
        <CompactGlucoseCard />
        <ForecastChartCard />
        <RecentNotesCard />
        <SensorAlarmsCard />
        <QuickActions />
        {errorMessage && (
          <p role="alert" className="px-2 text-center text-gm-caption text-sys-red">
            {errorMessage}
          </p>
        )}
      </div>
      {/* Sheet routes nested under /dashboard stack over this screen. */}
      <SheetOutlet />
    </>
  );
};
