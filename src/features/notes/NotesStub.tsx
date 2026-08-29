import React from 'react';
import { LargeTitle } from '../../app/shell/LargeTitle';
import { Card } from '../../ui/Card';

export const NotesStub: React.FC = () => (
  <>
    <LargeTitle>Notes</LargeTitle>
    <div className="px-3.5">
      <Card>
        <p className="text-gm-body text-label-secondary">
          The full notes list arrives in the next slice. Recent notes are on the Dashboard.
        </p>
      </Card>
    </div>
  </>
);
