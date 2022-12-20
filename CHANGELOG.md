# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2-alpha] - 2022-12-20

### Added

- Staging environment options for API and Faucet
- Functionality to end, pause, cancel and continue an election

### Fixed

- Fixed proof check using public key when signer is from type `Wallet`

### Changed

- Use voting endpoint instead of generic submitTx.
- Naming for client initialization options changed.
- There are now the new `UnpublishedElection` and `PublishedElection` classes
which extend from the abstract `Election` class.
- `fetchElection` accepts an election id.

## [0.0.1-alpha] - 2022-12-01

### Added

- First unstable version of the SDK for testing purposes

[0.0.2-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.2-alpha
[0.0.1-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.1-alpha
