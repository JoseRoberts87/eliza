module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        '^@elizaos/core$': '<rootDir>/src/__mocks__/@elizaos/core.ts'
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.json'
        }]
    },
    moduleDirectories: ['node_modules', '<rootDir>/../../node_modules']
};
