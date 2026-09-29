import React, { useEffect, useState } from 'react';

// Connectivity is read here rather than mirrored into GlucoseState: nothing
// else branches on it, and duplicating browser state into a reducer invites
// the two drifting apart.
export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="rounded-nested bg-orange-100 px-3 py-2 text-center">
      <p className="text-gm-caption font-semibold text-sys-orange">
        Offline — showing last known values
      </p>
    </div>
  );
};
