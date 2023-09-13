# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2023-09-13

### Fixed

- Ensuring proof `value` handled as hex for anonymous circuits inputs.

### Changed

- [**BREAKING**] Removed some (probably not used) client properties for future refactor.
- Added services as mid-layer between pure SDK client and API wrappers.

### Added

- Census3 supported chains information.

## [0.2.0] - 2023-09-04

### Fixed

- `dotobject` helper returns null when key is not found.

### Changed

- `collectFaucetTokens` function accepts raw faucet package payload.

### Added

- Census3 error typings.
- [**BREAKING**] Census3 anonymous censuses.

## [0.1.1] - 2023-08-14

### Fixed

- Added missing dependency `readable-stream`.

## [0.1.0] - 2023-08-11

### Added

- [**BREAKING**] Anonymous integration

### Fixed

- Added missing `maxCensusSize` and `manuallyEnded` in `fetchElection`.

## [0.0.18] - 2023-08-01

### Added

- Election `get` function to fetch metadata values using `dotobject`

### Fixed

- Added missing dependencies

## [0.0.17] - 2023-07-21

### Added

- Anonymous support using zkSNARK.

### Changed

- Election `meta` field has a more lax typing.

## [0.0.16] - 2023-07-04

### Added

- SDK version added to election metadata.
- Added new function `changeElectionCensus` to change the election census dynamically.
- Added new helper function `formatUnits` for formatting big decimals values.

### Changed

- New types defined in `VocdoniCensus3Client` with some additional documentation.
- Added new field `symbol` to summary token list in Census3.
- Added new field `size` to token information in Census3 as number of token holders.

### Fixed

- Error codes coming from the API.

## [0.0.15] - 2023-06-20

### Added

- New `InvalidElection` type for invalid elections.
- New `estimateElectionCost` function in client for estimating election cost.
- New `calculateElectionCost` function in client for calculating the exact election cost.
- New API wrappers for general chain information.

### Changed

- `fetchElections` returns new `InvalidElection` type instead of throwing.

### Fixed

- CSP elections use the URI and public key from the election census defined at creation.

## [0.0.14] - 2023-06-12

### Added

- `maxValue`, `maxCount` and `maxTotalCost` properties in `IVoteType` in an election for creating
quadratic, approval and ranked elections.

## [0.0.13] - 2023-06-06

### Added

- [Census3](https://github.com/vocdoni/census3/) integration
- Added `meta` parameters to election metadata
- Minor helper functions

### Changed

- Added some new information to API endpoints

### Fixed

- Unlocked rollup version

## [0.0.12] - 2023-05-09

### Fixed

- Fixed `personal_sign` provider call bug for certain environments

## [0.0.11] - 2023-04-25

### Fixed

- Fix type error in `fetchAccountInfo`

## [0.0.10] - 2023-04-25

### Fixed

- Fixed internal `SetAccountTx` nonce when creating transactions

## [0.0.9] - 2023-04-25

### Added

- `generateRandomWallet` function for assigning a random Wallet to the client

### Changed

- `isInCensus` doesn't accept census type because censuses with public keys are removed
- Refactored account methods to return new `AccountData` definition with `Account` field

### Removed

- Ability to create censuses using public keys

## [0.0.8] - 2023-04-05

### Added

- Custom error handling (WIP)

### Changed

- `votesLeftCount` checks if user is in census.
- `hasAlreadyVoted()` returns the vote id or null if the account hasn't voted.

### Fixed

- Increased time for transaction confirmation due to block time increase.

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

[0.3.0]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.3.0
[0.2.0]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.2.0
[0.1.1]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.1.1
[0.1.0]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.1.0
[0.0.18]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.18
[0.0.17]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.17
[0.0.16]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.16
[0.0.15]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.15
[0.0.14]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.14
[0.0.13]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.13
[0.0.12]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.12
[0.0.11]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.11
[0.0.10]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.10
[0.0.9]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.9
[0.0.8]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.8
[0.0.7]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.7
[0.0.6]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.6
[0.0.5]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.5
[0.0.4-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.4-alpha
[0.0.3-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.3-alpha
[0.0.2-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.2-alpha
[0.0.1-alpha]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.0.1-alpha
