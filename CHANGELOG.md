# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.4.4] - 2026-10-28

### Added

- `skill --short` prints a compact command cheat sheet.

### Fixed

- Skill guide listings use runnable commands instead of reference file links.
- Skill and describe parameter tables include nested object and array fields with nonempty descriptions.

### Changed

- README and site add a labelled install line that also adds ~/.local/bin to ~/.profile, and a pinned line on the site.

## [0.4.3] - 2026-10-28

### Added

- Machine-friendly `--version --short` and `--version --json` CLI output.
- `GHOSTPAW_NO_MODIFY_PATH=1` skips the Windows installer’s persistent user PATH edit.

## [0.4.2] - 2026-10-27

### Changed

- Embed workflow guides in the CLI with listing and help, and include nested parameter rows and schema-checked call examples in generated skills.
- Validate facade inputs before invoking tool handlers and include recovery shapes for invalid input.
- Release binaries are the default installation path in the README and generated skill, with explicit installer targets and variant labels in human version output.

## [0.4.1] - 2026-10-27

### Fixed

- Creating, renaming or awakening a soul with a name or slug that is already taken fails with a clear message (`A soul with name "Reviewer" already exists (ID 1); choose a different name.`) instead of SQLite's raw `UNIQUE constraint failed: souls.name` system error.
- Flag values that start with dashes are accepted; only a following `--name` token counts as the next flag.

## [0.4.0] - 2026-10-27

### Added

- 19 schema-derived command paths: `search`, `review`, `soul create|show|update|retire|awaken`, `shard drop|drop-batch|reveal`, `refinement add|revise|revert|reactivate|cite|attune`, and `level validate|up|revert`. Per-command help and bash, zsh and fish completions are included. Core commands work offline; search reads behavioral shards.
- Standalone binaries for linux-x64, linux-arm64, darwin-arm64, darwin-x64 and windows-x64, with SHA256SUMS and build attestations. Binaries are unsigned; macOS builds use ad-hoc signing.
- `install.sh` and `install.ps1` refuse checksum mismatches. Release install checks cover ubuntu-24.04, macos-15 and windows-2025.

### Changed

- Noun-verb commands support global output flags and exit codes 0 (success), 1 (tool error), 2 (usage), 3 (not found or clarification), 4 (conflict), and 70 (internal error). Existing CLI forms retain their output and exit codes.
- `SurfaceTool` accepts an optional `cli` mapping. MCP metadata remains unchanged.


## [0.3.0] - 2026-10-24

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

[Unreleased]: https://github.com/GhostPawJS/souls/compare/v0.4.4...HEAD
[0.4.4]: https://github.com/GhostPawJS/souls/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/GhostPawJS/souls/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/GhostPawJS/souls/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/GhostPawJS/souls/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/GhostPawJS/souls/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/GhostPawJS/souls/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/GhostPawJS/souls/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/GhostPawJS/souls/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/GhostPawJS/souls/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/GhostPawJS/souls/releases/tag/v0.2.0
