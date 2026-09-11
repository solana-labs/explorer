import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { PageSections } from '../PageSections';

describe('PageSections', () => {
    it('should render its children stacked with the standard between-blocks rhythm', () => {
        render(
            <PageSections data-testid="sections">
                <div>first</div>
                <div>second</div>
            </PageSections>,
        );
        const root = screen.getByTestId('sections');

        expect(root).toHaveClass('flex', 'flex-col', 'space-y-9', 'lg:space-y-12');
        expect(screen.getByText('first')).toBeInTheDocument();
        expect(screen.getByText('second')).toBeInTheDocument();
    });

    it('should merge a custom className and forward the ref', () => {
        const ref = createRef<HTMLDivElement>();
        render(
            <PageSections ref={ref} className="custom-class" data-testid="sections">
                content
            </PageSections>,
        );

        expect(screen.getByTestId('sections')).toHaveClass('custom-class', 'flex');
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
});
