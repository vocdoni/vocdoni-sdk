# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `votesLeftCount` checks if user is in census.
- `hasAlreadyVoted()` returns the vote id or null if the account hasn't voted.

## [0.0.7] - 2023-03-29

### Changed

- Updated `vocdoni/proto` library to version `1.14.1`.
- Added `maxCensusSize` to the election creation.

## [0.0.6] - 2023-03-22

### Changed

- `ElectionStatus` includes new values `ONGOING` and `UPCOMING`. `READY` is removed an only used internally.
- Election description changed from mandatory to optional.
- `fetchElections` accepts no account and returns all elections in the chain.
- `fetchAccountInfo` accepts arbitrary account to retrieve information.

## [0.0.5] - 2023-03-08

### Added

- `fetchElections` function to fetch all elections based on a given account
- New `organizationId` property in `PublishedElection`

### Changed

- `PublishedCensus` has `size` and `weight` fields for offchain census.

## [0.0.4-alpha] - 2023-03-01

### Added

- Credential service provider integrated
- Custom retry attempts and time for transactions waiting functionality
- Added `votesLeftCount` function for checking how many times a user can submit a vote
- New API requests added for chain information

### Changed

- `header` and `streamUri` are no longer mandatory when creating an election.

### Fixed

- No more 400 error status HTTP requests when asking for a non-confirmed transaction
- `maxValue` property fixed in election data

## [0.0.3-alpha] - 2023-01-31

### Added

- Functionality to check if a user is in census `isInCensus`
- Functionality to check if a user has already voted `hasAlreadyVoted`
- Functionality to check if a user is able to vote `isAbleToVote`
- Export UMD version via `@vocdoni/sdk/umd`
- Deterministic Wallet generation from arbitrary data

### Fixed

- Return `voteId` when submitting vote instead of the transaction hash.
- `Buffer` imports for bundle
- Bundling & export issues

### Changed

- Removed `dvote-solidity` dependency.

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

[0.0.7]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.7
[0.0.6]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.6
[0.0.5]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.5
[0.0.4-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.4-alpha
[0.0.3-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.3-alpha
[0.0.2-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.2-alpha
[0.0.1-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.1-alpha
