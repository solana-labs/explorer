import { ReactNode } from 'react';
import { Download } from 'react-feather';

export function Downloadable({ data, filename, children }: { data: string; filename: string; children: ReactNode }) {
    const handleClick = async () => {
        const blob = new Blob([Buffer.from(data, 'base64')]);
        const fileDownloadUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = fileDownloadUrl;
        tempLink.setAttribute('download', filename);
        tempLink.click();
    };

    return (
        <>
            <Download className="c-pointer me-2" onClick={handleClick} size={15} />
            {children}
        </>
    );
}
