import { Button } from '@/app/components/shared/ui/button';
import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { Card, CardBody } from '@/app/shared/ui/Card';
import { CopyableCode } from '@/app/shared/ui/CopyableCode';

import { NO_SECURITY_TXT_ERROR } from '../lib/constants';

// Card to display empty state and advice to upload security.txt
export function EmptySecurityTxtCard({ programAddress }: { programAddress: string }) {
    const copyableTxt = `npx @solana-program/program-metadata@latest write security ${programAddress} ./security.json`;

    return (
        <Card ui="dashkit">
            <CardBody ui="dashkit" className="p-3 text-center md:p-6">
                <div className="mb-4 md:mb-6">{NO_SECURITY_TXT_ERROR}</div>

                <div className="mb-4 md:mb-6">
                    <p>
                        This program did not provide Security.txt information yet. If you are the maintainer of this
                        program you can use the following command to add your information.
                    </p>
                    <div className="text-left">
                        <CopyableCode value={copyableTxt} />
                    </div>
                </div>
                <div className="text-dk-gray-700">
                    <Button ui="dashkit" variant="outline-primary" size="sm" asChild>
                        <ExternalLink href="https://github.com/solana-program/program-metadata">
                            For further details please follow the documentation
                        </ExternalLink>
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
}
