import SupplyPageClient from './page-client';

export const metadata = {
    description: `Overview of the native token supply`,
    title: `Supply Overview | Zuma`,
};

export default function SupplyPage() {
    return <SupplyPageClient />;
}
