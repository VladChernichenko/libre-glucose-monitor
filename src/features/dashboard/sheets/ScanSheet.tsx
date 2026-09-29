import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';

// Camera capture is slice F. This is an honest placeholder rather than a
// button that does nothing.
export const ScanSheet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Sheet title="Scan food" onClose={() => navigate(-1)}>
      <p className="text-gm-body text-label-secondary">
        Photo capture is not available in this build. Enter the meal manually for now.
      </p>
      <Link
        to="/dashboard/note/new"
        replace
        className="mt-4 block rounded-nested bg-sys-blue py-2.5 text-center text-gm-body font-semibold text-white"
      >
        Add note instead
      </Link>
    </Sheet>
  );
};
