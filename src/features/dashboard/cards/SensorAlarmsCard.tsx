import React from 'react';
import { Card } from '../../../ui/Card';
import { useGlucose } from '../../../state/GlucoseStore';

export const SensorAlarmsCard: React.FC = () => {
  const { dataSource } = useGlucose();
  // Only LibreLinkUp exposes sensor metadata; Nightscout has none to show.
  if (dataSource !== 'LIBRE_LINK_UP') return null;

  return (
    <Card className="flex items-center gap-2">
      <span>◉</span>
      <div className="flex-1">
        <p className="text-gm-caption font-semibold text-label">Sensor connected</p>
        <p className="text-gm-label text-label-secondary">Alarms managed in Settings</p>
      </div>
    </Card>
  );
};
