export const DrawerHeader = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="border-0 border-b border-solid border-dark-border">
            <div className="space-y-1.5 p-4">{children}</div>
        </div>
    );
};

DrawerHeader.displayName = 'Drawer.Header';
