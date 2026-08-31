import { useState } from 'react';

import { useToast } from '@/app/components/shared/ui/sonner/use-toast';
import { captureFeedback } from '@/app/shared/lib/sentry';

import type { FeedbackFormValues } from '../ui/BaseFeedbackForm';

export function useFeedbackForm() {
    const [isOpen, setIsOpen] = useState(false);
    const toast = useToast();

    const submit = (values: FeedbackFormValues) => {
        captureFeedback({
            message: values.message,
            name: values.contact,
            tags: { rating: values.rating, source: 'widget', type: 'feedback' },
        });
        setIsOpen(false);
        toast.custom({ description: 'Thank you fren, enjoy exploring', title: 'Feedback sent!', type: 'success' });
    };

    return { isOpen, setIsOpen, submit };
}
