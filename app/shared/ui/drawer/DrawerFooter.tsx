export const DrawerFooter = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex gap-2 border-0 border-t border-solid border-dark-border px-3 pb-6 pt-3">{children}</div>
    );
};

DrawerFooter.displayName = 'Drawer.Footer';
