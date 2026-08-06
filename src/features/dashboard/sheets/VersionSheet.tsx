import React from 'react';
import { useNavigate } from 'react-router-dom';
import VersionInfo from '../../../components/VersionInfo';

// No Sheet wrapper: VersionInfo already renders a full-screen overlay with its
// own header and close button, and it is rebuilt in a later slice.
export const VersionSheet: React.FC = () => {
  const navigate = useNavigate();
  return <VersionInfo isOpen onClose={() => navigate(-1)} />;
};
