/**
 * @fileoverview Port Cleanup Utility
 * @module utils/portCleanup
 * 
 * Kills any process using a specified port before server starts.
 * Windows-specific implementation using netstat and taskkill.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if a port is in use and kill the process using it (Windows)
 * @param port - Port number to check and clean
 * @returns Promise<boolean> - true if port was freed or already free
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
    const isWindows = process.platform === 'win32';

    try {
        if (isWindows) {
            // Find PID using netstat
            const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);

            if (!stdout || stdout.trim() === '') {
                console.log(`[PortCleanup] Port ${port} is free`);
                return true;
            }

            // Parse PIDs from netstat output
            const lines = stdout.trim().split('\n');
            const pids = new Set<string>();

            for (const line of lines) {
                // netstat output format: TCP 0.0.0.0:3055 0.0.0.0:0 LISTENING 12345
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];

                if (pid && /^\d+$/.test(pid) && pid !== '0') {
                    pids.add(pid);
                }
            }

            if (pids.size === 0) {
                console.log(`[PortCleanup] Port ${port} is free`);
                return true;
            }

            // Kill each PID
            for (const pid of pids) {
                console.log(`[PortCleanup] Killing process ${pid} on port ${port}...`);
                try {
                    await execAsync(`taskkill /PID ${pid} /F`);
                    console.log(`[PortCleanup] Killed process ${pid}`);
                } catch (killErr: any) {
                    // Process may already be gone
                    if (!killErr.message.includes('not found')) {
                        console.warn(`[PortCleanup] Failed to kill ${pid}: ${killErr.message}`);
                    }
                }
            }

            // Small delay to ensure port is released
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log(`[PortCleanup] Port ${port} cleared`);
            return true;

        } else {
            // Linux/macOS: use lsof and kill
            try {
                const { stdout } = await execAsync(`lsof -t -i:${port}`);

                if (!stdout || stdout.trim() === '') {
                    console.log(`[PortCleanup] Port ${port} is free`);
                    return true;
                }

                const pids = stdout.trim().split('\n');
                for (const pid of pids) {
                    if (pid) {
                        console.log(`[PortCleanup] Killing process ${pid} on port ${port}...`);
                        await execAsync(`kill -9 ${pid}`);
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500));
                console.log(`[PortCleanup] Port ${port} cleared`);
                return true;
            } catch {
                // lsof may fail if port is free
                return true;
            }
        }

    } catch (error: any) {
        // netstat may fail if port is not in use - that's fine
        if (error.message.includes('not find') || error.stderr?.includes('not find')) {
            console.log(`[PortCleanup] Port ${port} is free`);
            return true;
        }
        console.warn(`[PortCleanup] Error checking port ${port}: ${error.message}`);
        return false;
    }
}

/**
 * Ensure port is available before starting server
 */
export async function ensurePortAvailable(port: number): Promise<void> {
    console.log(`[PortCleanup] Ensuring port ${port} is available...`);
    const success = await killProcessOnPort(port);
    if (!success) {
        console.warn(`[PortCleanup] Could not guarantee port ${port} is free, proceeding anyway...`);
    }
}
