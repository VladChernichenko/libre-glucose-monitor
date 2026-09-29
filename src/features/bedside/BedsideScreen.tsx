import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlucose } from '../../state/GlucoseStore';

export const BedsideScreen: React.FC = () => {
  const { currentReading } = useGlucose();
  const navigate = useNavigate();

  // Keep the screen awake while the user is watching it overnight.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null;
      } catch {
        // Wake Lock is unsupported or was denied; bedside mode still works.
      }
    };
    void request();
    return () => {
      void lock?.release();
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black text-white">
      <p className="text-[96px] font-bold tabular-nums">
        {currentReading ? currentReading.value.toFixed(1) : '--'}
      </p>
      <p className="text-2xl text-white/60">
        {currentReading?.trendArrow} {currentReading?.unit}
      </p>
      <button
        type="button"
        aria-label="Exit bedside mode"
        onClick={() => navigate(-1)}
        className="mt-12 rounded-full border border-white/30 px-6 py-2 text-white/70"
      >
        Exit
      </button>
    </div>
  );
};
