import React from 'react';
import { LargeTitle } from '../../app/shell/LargeTitle';
import { Card } from '../../ui/Card';

export const ExperimentsStub: React.FC = () => (
  <>
    <LargeTitle>Experiments</LargeTitle>
    <div className="px-3.5">
      <Card>
        <p className="text-gm-body text-label-secondary">
          Guided experiments arrive in a later slice.
        </p>
      </Card>
    </div>
  </>
);
