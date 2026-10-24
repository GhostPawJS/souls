# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- MCP stdio server and public MCP subpath, with protocol negotiation and tool annotations.
- CLI for tool discovery, calls, and skill output.
- Generated Agent Skills, client and directory manifests, and MCP Bundle metadata.
- Dockerfile for persistent container hosting.
- Package, size, API, startup, and guardrail checks, plus offline benchmarks.


## [0.2.3] - 2026-10-24

### Added

- Document architecture, package usage, and contribution and release conventions.
- Verify that the package has no runtime dependencies in CI and releases.

### Changed

- Load HTTP transports on the first ether fetch instead of at package import.
- Enable WAL for file-backed ether databases and a five-second busy timeout for all ether connections.

### Fixed

- Correct README ether and tool examples to match the public API.

## [0.2.2] - 2026-04-06

### Added

- Add Playwright coverage for the demo, including ether search.

### Changed

- Publish releases through GitHub OIDC trusted publishing.

### Fixed

- Correct workflow configuration and format browser test calls.

## [0.2.1] - 2026-03-29

### Changed

- Remove the internal ether database opener from the public barrel to avoid loading SQLite in the package bundle.

## [0.2.0] - 2026-03-27

### Added

- Add ether catalog discovery and the browser demo.
- Document the domain model, usage, and entity mechanics.

## 0.1.0 - 2026-03-26

### Added

- Introduce SQLite-backed souls, traits, shards, and level-up operations with tests.
- Provide tool definitions, skills, and the built-in Mentor identity.
- Establish package configuration and CI and release workflows.

[Unreleased]: https://github.com/GhostPawJS/souls/compare/v0.2.3...HEAD
[0.2.3]: https://github.com/GhostPawJS/souls/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/GhostPawJS/souls/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/GhostPawJS/souls/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/GhostPawJS/souls/releases/tag/v0.2.0
