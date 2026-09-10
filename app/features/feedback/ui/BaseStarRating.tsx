import { Star } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

export interface BaseStarRatingProps {
    onChange?: (rating: number) => void;
    /** 0 means no rating selected. */
    value?: number;
}

const STARS = [1, 2, 3, 4, 5];

export function BaseStarRating({ onChange, value = 0 }: BaseStarRatingProps) {
    return (
        <div aria-label="Rating" className="flex items-center justify-center gap-1" role="radiogroup">
            {STARS.map(star => (
                <button
                    key={star}
                    aria-checked={value === star}
                    aria-label={`${star} of ${STARS.length} stars`}
                    className="cursor-pointer border-0 bg-transparent p-1"
                    onClick={() => onChange?.(star)}
                    role="radio"
                    type="button"
                >
                    <Star
                        aria-hidden="true"
                        className={cn(
                            star <= value ? 'fill-accent text-accent' : 'fill-heavy-metal-600 text-heavy-metal-600',
                        )}
                        size={36}
                    />
                </button>
            ))}
        </div>
    );
}
