import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '../../../ui/Sheet';
import { ForecastChartCard } from '../cards/ForecastChartCard';

export const ForecastSheet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Sheet title="Extended forecast" onClose={() => navigate(-1)}>
      <ForecastChartCard />
    </Sheet>
  );
};
