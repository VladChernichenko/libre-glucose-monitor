import { render, screen } from '@testing-library/react';
import { Card } from '../Card';
import { Pill } from '../Pill';
import { StatusPill } from '../StatusPill';
import { ListRow } from '../ListRow';

describe('ui primitives', () => {
  it('Card renders children inside a rounded surface', () => {
    render(<Card>content</Card>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('Pill applies the carb tone', () => {
    render(<Pill tone="carb">25 g</Pill>);
    expect(screen.getByText('25 g')).toHaveClass('bg-[var(--gm-carb-pill-bg)]');
  });

  it('StatusPill shows the capitalised status word', () => {
    render(<StatusPill status="normal" />);
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('ListRow renders title, subtitle and trailing content', () => {
    render(<ListRow title="Carb Ratio" subtitle="mmol/L per 10 g" trailing={<span>2,0</span>} />);
    expect(screen.getByText('Carb Ratio')).toBeInTheDocument();
    expect(screen.getByText('mmol/L per 10 g')).toBeInTheDocument();
    expect(screen.getByText('2,0')).toBeInTheDocument();
  });
});
