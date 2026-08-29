import React from 'react';
import { useNavigate } from 'react-router-dom';
import NutritionAnalyzerModal from '../../../components/NutritionAnalyzerModal';

// Same as VersionSheet: the modal owns its overlay and header, so wrapping it
// in a Sheet would stack two dialogs.
export const NutritionSheet: React.FC = () => {
  const navigate = useNavigate();
  return <NutritionAnalyzerModal isOpen onClose={() => navigate(-1)} />;
};
