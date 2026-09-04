import { useCluster } from '@entities/cluster';
import { clusterSlug } from '@utils/cluster';
import { useState } from 'react';

import { useToast } from '@/app/components/shared/ui/sonner/use-toast';
import { withScope } from '@/app/shared/lib/sentry';
import { sendFeedback } from '@/app/shared/lib/sentry/client';

import type { FeedbackFormValues } from '../ui/BaseFeedbackForm';

export function useFeedbackForm() {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { cluster } = useCluster();
    const toast = useToast();

    const submit = async (values: FeedbackFormValues) => {
        setIsSubmitting(true);
        try {
            // withScope: sendFeedback writes its tags onto the active scope, which must not leak into later events
            await withScope(() =>
                sendFeedback({
                    message: values.message,
                    name: values.contact,
                    tags: { cluster: clusterSlug(cluster), rating: values.rating, source: 'widget', type: 'feedback' },
                }),
            );
            setIsOpen(false);
            toast.custom({ description: 'Thank you fren, enjoy exploring', title: 'Feedback sent!', type: 'success' });
        } catch {
            // Delivery failed (e.g. Sentry blocked by a content blocker) — keep the form open so nothing is lost
            toast.custom({
                description: 'You can use the GitHub links in the form instead',
                title: 'Could not send feedback',
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return { isOpen, isSubmitting, setIsOpen, submit };
}
