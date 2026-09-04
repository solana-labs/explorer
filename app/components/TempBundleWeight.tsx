'use client';

import { jsPDF } from 'jspdf';

// Temporary probe: real client weight to demo the build-info freshness gate on the PR. Revert before merge.
export function TempBundleWeight() {
    return <span className="hidden">{jsPDF.name}</span>;
}
