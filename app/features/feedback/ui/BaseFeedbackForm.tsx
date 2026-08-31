import { useState } from 'react';
import { ExternalLink as ExternalLinkIcon, X } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/shared/ui/dialog';
import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { Input, inputVariants } from '@/app/components/shared/ui/input';
import { Label } from '@/app/components/shared/ui/label';
import {
    Slideover,
    SlideoverBody,
    SlideoverClose,
    SlideoverContent,
    SlideoverHeader,
    SlideoverTitle,
} from '@/app/components/shared/ui/slideover';
import { cn } from '@/app/components/shared/utils';
import { useBreakpoint } from '@/app/shared/lib/use-breakpoint';

import { BaseStarRating } from './BaseStarRating';

export interface FeedbackFormValues {
    contact?: string;
    message: string;
    /** 1-5; absent when the user skipped the stars. */
    rating?: number;
}

export interface BaseFeedbackFormProps {
    bugReportUrl: string;
    ideasUrl: string;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: FeedbackFormValues) => void;
    open: boolean;
}

const DESCRIPTION = "Any features missing or ideas to share? Drop them below and we'll consider adding them";

export function BaseFeedbackForm({ bugReportUrl, ideasUrl, onOpenChange, onSubmit, open }: BaseFeedbackFormProps) {
    const [rating, setRating] = useState(0);
    const { isSm } = useBreakpoint();

    // Text fields reset by unmounting with the dialog content; rating state lives here and must be reset by hand
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) setRating(0);
        onOpenChange(nextOpen);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
            contact: String(data.get('contact') || '') || undefined,
            message: String(data.get('message') || ''),
            rating: rating || undefined,
        });
        setRating(0);
    };

    const form = (
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <BaseStarRating onChange={setRating} value={rating} />
            <div className="flex flex-col gap-1.5">
                <Label className="text-neutral-200" htmlFor="feedback-message">
                    Feedback
                </Label>
                <textarea
                    className={cn(inputVariants({ variant: 'dark' }), 'h-auto resize-none')}
                    id="feedback-message"
                    // Keeps the event (which also carries breadcrumbs) far from Sentry's 1MB rejection line
                    maxLength={4096}
                    name="message"
                    required
                    rows={5}
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label className="text-neutral-200" htmlFor="feedback-contact">
                    X handle <span className="font-normal text-neutral-400">(optional)</span>
                </Label>
                {/* X handles are at most 15 chars plus the optional @ */}
                <Input id="feedback-contact" maxLength={16} name="contact" variant="dark" />
                <p className="m-0 text-xs text-neutral-400">So we can reach out if we have any questions</p>
            </div>
            <Button type="submit" ui="tw" variant="accent">
                Submit
            </Button>
        </form>
    );

    const githubLinks = (
        <p className="m-0 text-center text-xs text-neutral-400">
            Prefer GitHub?{' '}
            <ExternalLink className="cursor-pointer text-accent no-underline hover:underline" href={ideasUrl}>
                Suggest a feature <ExternalLinkIcon className="inline align-[-2px]" size={12} />
            </ExternalLink>{' '}
            or{' '}
            <ExternalLink className="cursor-pointer text-accent no-underline hover:underline" href={bugReportUrl}>
                report a bug <ExternalLinkIcon className="inline align-[-2px]" size={12} />
            </ExternalLink>
        </p>
    );

    // Bottom drawer below `sm`, centered dialog above — the shared Slideover owns the slide-up animation
    if (!isSm) {
        return (
            <Slideover open={open} onOpenChange={handleOpenChange}>
                <SlideoverContent aria-describedby={undefined}>
                    <SlideoverHeader>
                        {/* Preflight is skipped, so the UA h2 margins must be reset explicitly */}
                        <SlideoverTitle className="m-0">Give feedback</SlideoverTitle>
                        <SlideoverClose className="flex items-center justify-center rounded-sm border-0 bg-transparent p-0 text-neutral-500 opacity-70 transition-opacity hover:opacity-100">
                            <X size={16} />
                            <span className="sr-only">Close</span>
                        </SlideoverClose>
                    </SlideoverHeader>
                    <SlideoverBody className="flex flex-col gap-4 p-4 pb-6">
                        <p className="m-0 text-sm text-neutral-400">{DESCRIPTION}</p>
                        {form}
                        {githubLinks}
                    </SlideoverBody>
                </SlideoverContent>
            </Slideover>
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Give feedback</DialogTitle>
                    <DialogDescription>{DESCRIPTION}</DialogDescription>
                </DialogHeader>
                {form}
                {githubLinks}
            </DialogContent>
        </Dialog>
    );
}
