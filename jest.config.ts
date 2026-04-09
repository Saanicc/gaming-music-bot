import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  moduleFileExtensions: ["ts", "js", "json"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/root/(.*)$": "<rootDir>/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
