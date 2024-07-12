import SupplyPageClient from './page-client';

export const metadata = {
    description: `Overview of the native token supply on Xolana`,
    title: `Supply Overview | Xolana`,
};

export default function SupplyPage() {
    return <SupplyPageClient />;
}
