/**
 * Simple Mutex for synchronizing async operations
 */
export class Mutex {
    private mutex = Promise.resolve();

    /**
     * Lock the mutex
     * Returns a promise that resolves to an unlock function
     */
    lock(): Promise<() => void> {
        let unlock: () => void = () => { };

        // Create a new promise that will be the new tail of the mutex chain
        const nextLock = new Promise<void>(resolve => {
            unlock = resolve;
        });

        // Wait for the current tail to finish, then return the unlock function
        const willLock = this.mutex.then(() => unlock);

        // Update the tail to the new promise
        this.mutex = nextLock;

        return willLock;
    }

    /**
     * Run a task exclusively
     */
    async run<T>(task: () => Promise<T>): Promise<T> {
        const unlock = await this.lock();
        try {
            return await task();
        } finally {
            unlock();
        }
    }
}
