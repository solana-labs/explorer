import { ErrorCard } from '@components/common/ErrorCard';

export default function NotFoundPage() {
    return (
        <div className="container mt-n3">
            <ErrorCard text="Page not found" />
        </div>
    );
}
