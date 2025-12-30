/**
 * @fileoverview Class Registry for Dynamic Class Instantiation
 * @module Engine/ClassRegistry
 * 
 * Provides reflection-like mechanism to register and instantiate
 * real provider classes based on JSON test configuration.
 * 
 * Classes are registered externally to avoid import issues.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassConfig {
    /** Class name as used in scenarios */
    className: string;
    /** Factory function for custom instantiation */
    factory: (config: ProviderConfig, dependencies?: Map<string, any>) => any;
    /** Dependencies required (other class names) */
    dependencies?: string[];
}

export interface ProviderConfig {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
    wsUrl: string;
    network: 'TESTNET' | 'MAINNET';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Class Registry
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registry for provider classes with reflection-like instantiation.
 * 
 * @example
 * ```typescript
 * const registry = new ClassRegistry(config);
 * registry.register({
 *     className: 'BinanceRestClient',
 *     factory: (cfg) => new BinanceRestClient(cfg.apiKey, cfg.apiSecret, { baseUrl: cfg.baseUrl })
 * });
 * const client = registry.getInstance<BinanceRestClient>('BinanceRestClient');
 * ```
 */
export class ClassRegistry {
    private classes: Map<string, ClassConfig> = new Map();
    private instances: Map<string, any> = new Map();
    private config: ProviderConfig;

    constructor(config: ProviderConfig) {
        this.config = config;
    }

    /**
     * Registers a class for dynamic instantiation.
     */
    public register(config: ClassConfig): void {
        this.classes.set(config.className, config);
    }

    /**
     * Registers multiple classes.
     */
    public registerAll(configs: ClassConfig[]): void {
        for (const config of configs) {
            this.register(config);
        }
    }

    /**
     * Gets or creates an instance of a registered class.
     */
    public getInstance<T>(className: string): T {
        // Return cached instance if exists
        if (this.instances.has(className)) {
            return this.instances.get(className) as T;
        }

        const classConfig = this.classes.get(className);
        if (!classConfig) {
            throw new Error(`Class not registered: ${className}`);
        }

        // Resolve dependencies first
        const deps = new Map<string, any>();
        if (classConfig.dependencies) {
            for (const dep of classConfig.dependencies) {
                deps.set(dep, this.getInstance(dep));
            }
        }

        // Create instance using factory
        const instance = classConfig.factory(this.config, deps);
        this.instances.set(className, instance);
        return instance as T;
    }

    /**
     * Invokes a method on a registered class instance.
     */
    public async invokeMethod(
        className: string,
        methodName: string,
        params: Record<string, any>
    ): Promise<any> {
        const instance = this.getInstance(className);
        const method = (instance as any)[methodName];

        if (typeof method !== 'function') {
            throw new Error(`Method '${methodName}' not found on ${className}`);
        }

        // Convert params object to method arguments
        const args = Object.values(params);
        return await method.apply(instance, args);
    }

    /**
     * Gets all registered class names.
     */
    public getRegisteredClasses(): string[] {
        return Array.from(this.classes.keys());
    }

    /**
     * Gets class metadata for reflection.
     */
    public getClassMetadata(className: string): {
        methods: string[];
        properties: string[];
    } | undefined {
        const instance = this.getInstance(className);
        if (!instance) return undefined;

        const prototype = Object.getPrototypeOf(instance);
        const methods = Object.getOwnPropertyNames(prototype)
            .filter(name => name !== 'constructor' && typeof (instance as any)[name] === 'function');

        const properties = Object.keys(instance);

        return { methods, properties };
    }

    /**
     * Clears all cached instances.
     */
    public clearInstances(): void {
        this.instances.clear();
    }

    /**
     * Gets the current configuration.
     */
    public getConfig(): ProviderConfig {
        return this.config;
    }
}

/**
 * Creates a ClassRegistry with the given configuration.
 */
export function createClassRegistry(config: ProviderConfig): ClassRegistry {
    return new ClassRegistry(config);
}
