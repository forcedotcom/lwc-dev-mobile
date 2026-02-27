# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Salesforce CLI plugin (`@salesforce/lwc-dev-mobile`) providing mobile extensions for Lightning Web Components Local Development. It manages iOS simulators and Android emulators for mobile app development through the `sf` CLI.

## Common Commands

```bash
# Install dependencies
yarn install

# Build (compile + lint via wireit)
yarn build

# Compile TypeScript only
yarn compile

# Lint
yarn lint

# Format code
yarn format

# Check formatting
yarn format:check

# Run unit tests with coverage
yarn test

# Run a single test file
npx mocha 'test/unit/cli/commands/force/lightning/local/device/create.test.ts'

# Run tests matching a pattern
npx mocha --grep "should create" 'test/unit/**/*.test.ts'

# Run during development (ts-node, no compilation needed)
./bin/dev.js force lightning local device list --platform android
```

## Architecture

### Plugin Structure (oclif-based)

This is an oclif CLI plugin. Commands are discovered by oclif from `dist/cli/commands/` based on directory structure — the file path maps directly to the CLI command name.

**Commands** (under `src/cli/commands/force/lightning/`):

-   `local/setup.ts` — Environment setup
-   `local/device/create.ts`, `list.ts`, `start.ts` — Device management
-   `local/app/install.ts`, `launch.ts` — App deployment
-   `lwc/test/ui/mobile/configure.ts`, `run.ts` — UI test automation

All commands are re-exported from `src/index.ts`.

### Command Pattern

Every command extends `BaseCommand` from `@salesforce/lwc-dev-mobile-core` and follows this structure:

1. **Messages**: Loaded from markdown files in `messages/` via `Messages.importMessagesDirectoryFromMetaUrl`
2. **Flags**: Defined as static using `CommandLineUtils.createFlag()` for common flags (platform, json, log-level) and `Flags.*` from `@salesforce/sf-plugins-core` for command-specific flags
3. **Command name**: `protected _commandName` is abstract in `BaseCommand` — every command must set it (e.g., `'force:lightning:local:device:list'`). Used for telemetry event names.
4. **Requirements**: `populateCommandRequirements()` sets up pre-flight checks (e.g., environment validation, device name availability) processed by `RequirementProcessor`
5. **Execution**: `run()` handles both CLI mode (with spinner via `CommonUtils.startCliAction`) and JSON mode (returns typed data validated by Zod schemas)
6. **Platform branching**: Android vs iOS is determined by `CommandLineUtils.platformFlagIsAndroid()`, delegating to `AndroidDeviceManager`/`AppleDeviceManager` or `AndroidUtils`/`IOSUtils`

### Telemetry (PFT)

Product Feature Tracking is handled automatically by `BaseCommand.init()` — it emits a `{commandName}.executed` event via `Lifecycle.emitTelemetry()` in a `.finally()` block. No per-command code needed. O11y config (`enableO11y`, `o11yUploadEndpoint`, `productFeatureId`) lives in `package.json`. Requires `@salesforce/cli >= 2.126.0`.

### Key Dependencies

-   **`@salesforce/lwc-dev-mobile-core`**: Provides `BaseCommand`, device managers, platform utilities, requirement system, and environment checks. This is where most platform-specific logic lives.
-   **`zod`**: Runtime schema validation for JSON output (schemas in `src/cli/schema/`)
-   **`@salesforce/core`**: `Messages` (i18n), `Logger`
-   **`@salesforce/sf-plugins-core`**: `Flags` definitions

### Messages / i18n

CLI text (summaries, flag descriptions, examples, error messages) lives in `messages/*.md` files, not in source code. Each command loads its own message file by name (e.g., `device-create.md`).

## Code Style

-   **Module system**: ESM (`"type": "module"` in package.json). Use `.js` extensions in import paths even for TypeScript files.
-   **Formatting**: Prettier — 4-space indent, single quotes, no trailing commas, 120 char width.
-   **Linting**: ESLint with `eslint-config-salesforce-typescript` + `plugin:sf-plugin/recommended`.
-   **Conventional commits**: Enforced via commitlint + husky hooks.

## Testing

-   **Framework**: Mocha + Chai assertions + Sinon/ts-sinon for mocking
-   **Test location**: `test/unit/` mirrors `src/` structure, files named `*.test.ts`
-   **Test isolation**: Uses `TestContext` from `@salesforce/core` for sandbox management
-   **Coverage thresholds**: 75% lines, 80% statements, 75% branches, 75% functions (enforced by c8)
-   **Pattern**: Stub external dependencies from `@salesforce/lwc-dev-mobile-core` (device managers, utils) and test both CLI and JSON output modes
-   **Telemetry testing**: Stub `Lifecycle.getInstance().emitTelemetry` and assert the payload has correct `eventName` and `commandName`

## Build System

Wireit orchestrates builds. `yarn build` runs both `compile` and `lint`. TypeScript compiles to `dist/` with incremental builds. Node.js >=20 required (Volta pins to 20.18.0, Yarn 1.22.22).
