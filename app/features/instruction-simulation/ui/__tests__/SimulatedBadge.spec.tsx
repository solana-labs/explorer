import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SimulatedBadge } from '../SimulatedBadge';

describe('SimulatedBadge', () => {
    it('should render its children', () => {
        render(<SimulatedBadge>S</SimulatedBadge>);

        expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('should carry the accent outline that marks simulation-derived UI', () => {
        render(<SimulatedBadge>Simulated</SimulatedBadge>);

        expect(screen.getByText('Simulated')).toHaveClass('text-accent');
    });
});
