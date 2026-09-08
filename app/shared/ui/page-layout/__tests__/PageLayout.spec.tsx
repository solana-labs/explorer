import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { PageLayout } from '../PageLayout';

describe('PageLayout', () => {
    it('should render its children', () => {
        render(
            <PageLayout>
                <div>block</div>
            </PageLayout>,
        );

        expect(screen.getByText('block')).toBeInTheDocument();
    });

    it('should apply the default shell padding and max-width', () => {
        render(<PageLayout data-testid="layout">content</PageLayout>);
        const root = screen.getByTestId('layout');

        expect(root).toHaveClass('mx-auto', 'flex', 'flex-col', 'px-4', 'lg:px-6', 'pt-3', 'lg:pt-5');
        expect(root).toHaveClass('max-w-5xl');
    });

    it('should not own the between-blocks rhythm (that lives in PageSections)', () => {
        render(<PageLayout data-testid="layout">content</PageLayout>);

        expect(screen.getByTestId('layout')).not.toHaveClass('space-y-9', 'lg:space-y-12');
    });

    it('should span the parent when width is full', () => {
        render(
            <PageLayout data-testid="layout" width="full">
                content
            </PageLayout>,
        );
        const root = screen.getByTestId('layout');

        expect(root).toHaveClass('max-w-none');
        expect(root).not.toHaveClass('max-w-5xl');
    });

    it('should merge a custom className and forward arbitrary props', () => {
        render(
            <PageLayout className="custom-class" data-testid="layout">
                content
            </PageLayout>,
        );

        expect(screen.getByTestId('layout')).toHaveClass('custom-class', 'mx-auto');
    });

    it('should forward the ref to the underlying element', () => {
        const ref = createRef<HTMLDivElement>();
        render(<PageLayout ref={ref}>content</PageLayout>);

        expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
});
