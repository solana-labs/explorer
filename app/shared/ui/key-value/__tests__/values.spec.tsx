import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeBlock, ExternalLinkValue, StackedList, TextValue } from '../values';

describe('key-value values', () => {
    describe('TextValue', () => {
        it('should render monospace by default', () => {
            render(<TextValue>abc</TextValue>);
            expect(screen.getByText('abc')).toHaveClass('font-mono');
        });

        it('should render prose font when mono is false', () => {
            render(<TextValue mono={false}>abc</TextValue>);
            expect(screen.getByText('abc')).not.toHaveClass('font-mono');
        });
    });

    describe('ExternalLinkValue', () => {
        it('should render a safe external anchor', () => {
            render(<ExternalLinkValue url="https://example.com">Example</ExternalLinkValue>);

            const link = screen.getByRole('link', { name: 'Example' });
            expect(link).toHaveAttribute('href', 'https://example.com');
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });

        it('should fall back to the url as label', () => {
            render(<ExternalLinkValue url="https://example.com" />);
            expect(screen.getByRole('link')).toHaveTextContent('https://example.com');
        });
    });

    it('should render StackedList as a list', () => {
        render(
            <StackedList>
                <li>one</li>
                <li>two</li>
            </StackedList>,
        );

        expect(screen.getByRole('list')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('should render CodeBlock as preformatted content', () => {
        render(<CodeBlock>-----BEGIN PGP-----</CodeBlock>);
        expect(screen.getByText('-----BEGIN PGP-----')).toBeInTheDocument();
    });
});
