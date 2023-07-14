import { localStorageIsAvailable } from '@utils/local-storage';
import { ChangeEvent } from 'react';

export default function ClusterModalDeveloperSettings() {
    const showDeveloperSettings = localStorageIsAvailable();
    const enableCustomUrl = showDeveloperSettings && localStorage.getItem('enableCustomUrl') !== null;
    const onToggleCustomUrlFeature = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            localStorage.setItem('enableCustomUrl', '');
        } else {
            localStorage.removeItem('enableCustomUrl');
        }
    };
    if (showDeveloperSettings !== true) {
        return null;
    }
    return (
        <>
            <hr />
            <h2 className="text-center mb-4 mt-4">Developer Settings</h2>
            <div className="d-flex justify-content-between">
                <span className="me-3">Enable custom url param</span>
                <div className="form-check form-switch">
                    <input
                        type="checkbox"
                        defaultChecked={enableCustomUrl}
                        className="form-check-input"
                        id="cardToggle"
                        onChange={onToggleCustomUrlFeature}
                    />
                    <label className="form-check-label" htmlFor="cardToggle"></label>
                </div>
            </div>
            <p className="text-muted font-size-sm mt-3">
                Enable this setting to easily connect to a custom cluster via the &ldquo;customUrl&rdquo; url param.
            </p>
        </>
    );
}
