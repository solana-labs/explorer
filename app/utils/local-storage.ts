let localStorageIsAvailableDecision: boolean | undefined;
export function localStorageIsAvailable() {
    if (localStorageIsAvailableDecision === undefined) {
        const test = 'test';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            localStorageIsAvailableDecision = true;
        } catch (e) {
            localStorageIsAvailableDecision = false;
        }
    }
    return localStorageIsAvailableDecision;
}
