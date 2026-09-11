import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProgramSecurityTXTLabel } from '../SecurityTXTLabel';

describe('ProgramSecurityTXTLabel', () => {
    it('should render the plain "Security.txt" label', () => {
        // The label is now just text with a help tooltip; the external doc link moved onto the
        // Security.txt badge, so this component no longer resolves a source or renders a link.
        render(<ProgramSecurityTXTLabel />);
        expect(screen.getByText('Security.txt')).toBeInTheDocument();
    });
});
