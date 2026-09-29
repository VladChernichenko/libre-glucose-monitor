import React, { useState } from 'react';
import { LargeTitle } from '../../app/shell/LargeTitle';
import { Card } from '../../ui/Card';
import { ListRow } from '../../ui/ListRow';
import DataSourceConfigModal from '../../components/DataSourceConfigModal';
import COBSettings from '../../components/COBSettings';
import InsulinPreferencesSettings from '../../components/InsulinPreferencesSettings';
import LibreLinkUpTest from '../../components/LibreLinkUpTest';
import { cobSettingsApi, COBSettingsData } from '../../services/cobSettingsApi';
import { dataSourceConfigApi } from '../../services/dataSourceConfigApi';

type OpenModal = 'dataSource' | 'cob' | 'insulin' | 'libreTest' | null;

const Chevron = () => <span className="text-label-secondary">›</span>;

const Icon: React.FC<{ bg: string; glyph: string }> = ({ bg, glyph }) => (
  <span
    className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-sm text-white"
    style={{ background: bg }}
  >
    {glyph}
  </span>
);

export const SettingsHost: React.FC = () => {
  const [open, setOpen] = useState<OpenModal>(null);
  const [cobSettings, setCobSettings] = useState<COBSettingsData | null>(null);
  const [cobError, setCobError] = useState<string | null>(null);
  const close = () => setOpen(null);

  // COBSettings needs a config object up front, so it is fetched on demand
  // rather than on mount — Settings should render even with the API down.
  const openCob = async () => {
    setCobError(null);
    try {
      const settings = await cobSettingsApi.getCOBSettings();
      setCobSettings(settings);
      setOpen('cob');
    } catch {
      setCobError('Could not load Carbs on Board settings.');
    }
  };

  const saveCob = async (config: {
    carbRatio: number;
    isf: number;
    carbHalfLife: number;
    maxCOBDuration: number;
  }) => {
    try {
      const settings: COBSettingsData = {
        carbRatio: config.carbRatio,
        isf: config.isf,
        carbHalfLife: config.carbHalfLife,
        maxCOBDuration: config.maxCOBDuration,
      };
      await cobSettingsApi.saveCOBSettings(settings);
      setCobSettings(settings);
      close();
    } catch {
      setCobError('Could not save Carbs on Board settings.');
    }
  };

  return (
    <>
      <LargeTitle>Settings</LargeTitle>
      <div className="flex flex-col gap-3.5 px-3.5">
        <Card className="py-1">
          <ListRow
            leading={<Icon bg="var(--gm-red)" glyph="∿" />}
            title="Data Source"
            trailing={<Chevron />}
            onClick={() => setOpen('dataSource')}
          />
        </Card>
        <Card className="py-1">
          <ListRow title="Carbs on Board" trailing={<Chevron />} onClick={openCob} />
          <div className="border-t border-separator" />
          <ListRow
            title="Insulin Preferences"
            trailing={<Chevron />}
            onClick={() => setOpen('insulin')}
          />
          <div className="border-t border-separator" />
          <ListRow
            title="LibreLinkUp Test"
            trailing={<Chevron />}
            onClick={() => setOpen('libreTest')}
          />
        </Card>
        {cobError && (
          <p className="px-1 text-gm-caption text-sys-red" role="alert">
            {cobError}
          </p>
        )}
      </div>

      {open === 'dataSource' && (
        <DataSourceConfigModal
          isOpen
          onClose={close}
          onSave={async (config) => {
            if (config.dataSource === 'libre' && config.libre) {
              dataSourceConfigApi.saveLibreConfig(config.libre);
            }
            close();
          }}
        />
      )}
      {open === 'cob' && cobSettings && (
        <COBSettings
          config={{
            carbRatio: cobSettings.carbRatio,
            isf: cobSettings.isf,
            carbHalfLife: cobSettings.carbHalfLife,
            maxCOBDuration: cobSettings.maxCOBDuration,
          }}
          onConfigChange={saveCob}
          onClose={close}
        />
      )}
      {open === 'insulin' && <InsulinPreferencesSettings onClose={close} />}
      {open === 'libreTest' && <LibreLinkUpTest />}
    </>
  );
};
