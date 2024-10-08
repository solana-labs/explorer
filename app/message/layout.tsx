import React from 'react';

export default function MessageLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="container">
            {children}
        </div>
    );
}