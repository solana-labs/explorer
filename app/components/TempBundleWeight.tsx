'use client';

import { jsPDF } from 'jspdf';

// Temporary probe: real client weight to demo the bundle-increase comment. Revert before merge.
export function TempBundleWeight() {
    return <span className="hidden">{jsPDF.name}</span>;
}
