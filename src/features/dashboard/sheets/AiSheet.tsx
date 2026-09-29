import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import AIInsightPanel from '../../../components/AIInsightPanel';

// AIInsightPanel is a trigger plus its own analysis modal, not an overlay, so
// it sits inside a Sheet cleanly.
export const AiSheet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Sheet title="AI insights" onClose={() => navigate(-1)}>
      <AIInsightPanel />
    </Sheet>
  );
};
