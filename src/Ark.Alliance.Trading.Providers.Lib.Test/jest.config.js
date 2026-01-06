/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/Src'],
    testMatch: [
        '**/*.test.ts',
        '**/*.spec.ts'
    ],
    moduleNameMapper: {
        // Library path mappings (order matters - more specific first)
        '^ark-alliance-trading-providers-lib/Common/services$': '<rootDir>/../Ark.Alliance.Trading.Providers.Lib/Src/Common/services/index.ts',
        '^ark-alliance-trading-providers-lib/Deribit$': '<rootDir>/../Ark.Alliance.Trading.Providers.Lib/Src/Deribit/index.ts',
        '^ark-alliance-trading-providers-lib/Binance$': '<rootDir>/../Ark.Alliance.Trading.Providers.Lib/Src/Binance/index.ts',
        '^ark-alliance-trading-providers-lib/Kraken$': '<rootDir>/../Ark.Alliance.Trading.Providers.Lib/Src/Kraken/index.ts',
        '^ark-alliance-trading-providers-lib/Services$': '<rootDir>/../Ark.Alliance.Trading.Providers.Lib/Src/Services/index.ts',
        '^ark-alliance-trading-providers-lib$': '<rootDir>/../Ark.Alliance.Trading.Providers.Lib/Src/index.ts',
        // Internal aliases
        '^@engine/(.*)$': '<rootDir>/Src/Engine/$1',
        '^@binance/(.*)$': '<rootDir>/Src/Binance/$1',
        '^@deribit/(.*)$': '<rootDir>/Src/Deribit/$1',
        '^@common/(.*)$': '<rootDir>/Src/Common/$1',
        '^@scenarios/(.*)$': '<rootDir>/Src/Scenarios/$1',
        '^@lib/(.*)$': '<rootDir>/../Ark.Alliance.Trading.Providers.Lib/Src/$1',
        // Mock uuid to avoid ESM issues
        '^uuid$': 'uuid'
    },
    // Handle ESM packages from any node_modules location
    transformIgnorePatterns: [
        '<rootDir>/node_modules/(?!uuid)',
        '<rootDir>/../Ark.Alliance.Trading.Providers.Lib/node_modules/(?!uuid)'
    ],
    // Transform settings for ts-jest
    transform: {
        '^.+\\.[tj]sx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            useESM: false,
            isolatedModules: true
        }]
    },
    collectCoverageFrom: [
        'Src/**/*.ts',
        '!Src/**/*.d.ts',
        '!Src/**/index.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/Src/setupTests.ts'],
    testTimeout: 30000,
    verbose: true
};
