import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
    it('should render the title as the page h1', () => {
        render(<PageHeader title="Transaction" />);

        expect(screen.getByRole('heading', { level: 1, name: 'Transaction' })).toBeInTheDocument();
    });

    it('should render the eyebrow when provided and omit it otherwise', () => {
        const { rerender } = render(<PageHeader eyebrow="Details" title="Transaction" />);
        expect(screen.getByText('Details')).toBeInTheDocument();

        rerender(<PageHeader title="Transaction" />);
        expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should default to the inline spacing that tightens it against the sticky tabs', () => {
        render(<PageHeader title="Transaction" />);

        expect(screen.getByRole('banner')).toHaveClass('-mb-6', 'lg:mb-0', 'gap-1.5');
    });

    it('should use standalone spacing (own padding, no negative margin) when requested', () => {
        render(<PageHeader spacing="standalone" title="Block" />);
        const header = screen.getByRole('banner');

        expect(header).toHaveClass('mb-3', 'py-6', 'gap-1.5');
        expect(header).not.toHaveClass('-mb-6');
    });

    it('should scale the title down when size is sm', () => {
        render(<PageHeader size="sm" title="Transaction" />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-xl', 'md:text-2xl');
    });

    it('should render additional children after the title', () => {
        render(
            <PageHeader title="Transaction">
                <p>subtitle</p>
            </PageHeader>,
        );

        expect(screen.getByText('subtitle')).toBeInTheDocument();
    });

    it('should merge a custom className and forward the ref to the header element', () => {
        const ref = createRef<HTMLElement>();
        render(<PageHeader ref={ref} className="custom-class" title="Transaction" />);

        expect(screen.getByRole('banner')).toHaveClass('custom-class', 'flex');
        expect(ref.current?.tagName).toBe('HEADER');
    });
});
