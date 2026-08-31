import { AlertCircle, GitHub, MessageCircle, MessageSquare } from 'react-feather';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/shared/ui/dropdown-menu';
import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { IconButton } from '@/app/components/shared/ui/icon-button';

export interface BaseFeedbackWidgetProps {
    bugReportUrl: string;
    ideasUrl: string;
    onShareFeedback?: () => void;
    /** The Sentry-backed feedback form needs a client DSN; the GitHub links work without one. */
    showSentryActions?: boolean;
}

export function BaseFeedbackWidget({
    bugReportUrl,
    ideasUrl,
    onShareFeedback,
    showSentryActions = true,
}: BaseFeedbackWidgetProps) {
    return (
        // z-40 keeps the trigger under the shared dialog's z-50, so an open modal dims it (same contract as CookieConsent)
        <div className="fixed bottom-4 right-4 z-40 flex rounded-full shadow-lg before:absolute before:-inset-[1.5px] before:-z-10 before:rounded-full before:bg-gradient-to-br before:from-[#9945FF] before:to-[#14F195]">
            <div className="flex rounded-full bg-[#141816]">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <IconButton
                            aria-label="Feedback"
                            className="!h-8 !w-8 rounded-full [&_svg]:!size-4"
                            icon={<MessageSquare />}
                            variant="ghost"
                        />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top">
                        {showSentryActions && (
                            <DropdownMenuItem className="!cursor-pointer" onSelect={onShareFeedback}>
                                <MessageCircle /> Share feedback
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild className="!cursor-pointer">
                            {/* Preflight is skipped, so the UA anchor color/underline must be reset explicitly */}
                            <ExternalLink className="text-inherit no-underline" href={ideasUrl}>
                                <GitHub /> Suggest an idea
                            </ExternalLink>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="!cursor-pointer">
                            <ExternalLink className="text-inherit no-underline" href={bugReportUrl}>
                                <AlertCircle /> Report a bug
                            </ExternalLink>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
