# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.3] - 2024-06-12

### Added

- Added new transaction for changing an election duration.
- Added new functions `changeElectionEndDate` and `changeElectionDuration`.
- Added new raw information when election data is not complete.

### Changed

- Census3 `getStrategyHolders` changed for using queues instead of direct endpoint call.

## [0.8.2] - 2024-06-12

### Added

- Added API fees calls functions for checking all fees and account fees.
- Added new function to modify an election maximum census size.
- Added new `delta` parameter when checking for next election identifiers.

### Changed

- Census publishing is done async to avoid 502 errors when uploading large censuses.
- Modified change census function to accept a new maximum census size.

## [0.8.1] - 2024-05-21

### Added

- Support for encrypted metadata for elections.
- Vote information for encrypted votes with the corresponding vote package.

## [0.8.0] - 2024-04-19

### Added

- Several new examples in `examples` folder for beginners.
- New Census3 function to estimate the time of creating a census based on a predicate.
- Added `StrategyCensus` type for representing census created in Census3 based on a complex strategy.

### Changed

- Internal usage of dates instead of blocks when creating an election.

### Fixed

- Fixed anonymous `voteHash` by using the `votePackage` to generate zk-inputs.

## [0.7.5] - 2024-02-15

### Added

- Added support for getting token holder balance in Census3 using `tokenHolderBalance`.
- Added support for getting token holders based on strategy using `getStrategyHolders`.

### Fixed

- Fixed `CensusOrigin` when election is using CSP census and anonymous.
- Fixed bad generation of `dist` bundles in previous version.

## [0.7.4] - 2024-02-06

### Added

- Added new `CspProofType` type when voting in a CSP based election to choose the encryption type.

## [0.7.3] - 2024-01-23

### Added

- Added new `ApprovalElection` election type for creating approval elections easily.

### Fixed

- Fixed `costExponent` to 1.
- Fixed error when election has no metadata.
- Fixed error with questions results for elections with no new type metadata.

## [0.7.2] - 2024-01-17

### Added

- Added new `MultiChoiceElection` election type for creating multi-choice elections easily.
- Added new `BudgetElection` election type for creating budget elections easily.

### Fixed

- Results in published elections are now correctly returned for each type of election.

## [0.7.1] - 2024-01-11

### Changed

- Supported tokens from Census3 using `getSupportedTokens()` returns now a token summary.
- Census3 `getStrategyEstimation` accepts `anonymous` flag and returns `accuracy` for anonymous censuses.

### Fixed

- Removed `nullifier` from vote package.
- Returning census from type `CspCensus` when election is for CSP.

### Added

- Added `ArchivedAccountData` for dealing with archived accounts and new `fetchAccount` function in client.
- Added `ErrFaucetAlreadyFunded` for faucet limit requests.
- Added `ErrElectionFinished` for doing actions when election is finished.
- Added `submitVoteSteps` for voting using async generator steps.

## [0.7.0] - 2023-12-13

### Changed

- Changed sha256 library from `@ethersproject/sha2` to `js-sha256` for web workers.
- Using API endpoint for estimating blocks from dates when creating an election.
- [**BREAKING**] Census3 `getStrategySize` function changed to `getStrategyEstimation` giving estimated time and size for the given strategy.

## [0.6.1] - 2023-11-29

### Added

- New anonymous function `hasRegisteredSIK` for checking if a user has registered a SIK.

### Fixed

- Removed outliers from block times for avoiding block estimation issues.

## [0.6.0] - 2023-11-28

### Added

- New election service functions `nextElectionId` and `getElectionSalt`.

### Changed

- [**BREAKING**] Refactored options for `isInCensus`, `hasAlreadyVoted`, `isAbleToVote` and `votesLeftCount`.
- [**BREAKING**] New options for `AnonymousVote` which enable to add the user's signature.
- [**BREAKING**] New internal anonymous flow when signature is given by the consumer.

## [0.5.3] - 2023-11-28

### Added

- New account methods supported for listing, counting and checking account transfers in `AccountAPI`.

### Fixed

- Archived elections without census URI are now accepted.

### Changed

- Faucet options don't require `token_limit` anymore.

## [0.5.2] - 2023-11-16

### Fixed

- Anonymous vote packages are no longer signed.

## [0.5.1] - 2023-11-15

### Fixed

- Missing exported election type `ArchivedElection`.
- Faucet errors correctly shown with message.

## [0.5.0] - 2023-11-14

### Changed

- [**BREAKING**] New full integration for Census3 v2, using tokens, strategies and censuses.

## [0.4.3] - 2023-11-09

### Added

- Support for archived elections with new election type `ArchivedElection` and with new census with type `ArchivedCensus`.

## [0.4.2] - 2023-11-06

### Changed

- Removed faucet path from default URLs.
- Updated `@vocdoni/proto` dependency to `1.15.4`.

### Added

- Import, export and delete census functionality in census service.
- Added new election parameter `temporarySecretIdentity` for deleting temporary SIKs once election is finished.

### Fixed

- Fixed `ffjavascript` dependency to `0.2.59`.

## [0.4.1] - 2023-10-24

### Changed

- Modified `dev`, `stg` and `prod` default URLs for all services.
- Upgraded to new faucet.

## [0.4.0] - 2023-10-10

### Changed

- [**BREAKING**] New signatures for chain transactions.

## [0.3.2] - 2023-10-10

### Added

- Added support for uploading big censuses in chunks.

### Fixed

- Added `assert` as embedded in rollup configuration.

## [0.3.1] - 2023-09-20

### Added

- New `createElectionSteps` function in client for using async generators and control creation flow.
- New `sendTokens` function in client for transferring tokens between accounts.

### Changed

- New user-friendly text for SIK payload signing.

### Fixed

- Added `ethers` as embedded in rollup configuration for `circomlibjs` dependencies.

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

[0.8.3]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.8.3
[0.8.2]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.8.2
[0.8.1]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.8.1
[0.8.0]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.8.0
[0.7.5]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.7.5
[0.7.4]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.7.4
[0.7.3]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.7.3
[0.7.2]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.7.2
[0.7.1]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.7.1
[0.7.0]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.7.0
[0.6.1]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.6.1
[0.6.0]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.6.0
[0.5.3]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.5.3
[0.5.2]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.5.2
[0.5.1]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.5.1
[0.5.0]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.5.0
[0.4.3]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.4.3
[0.4.2]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.4.2
[0.4.1]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.4.1
[0.4.0]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.4.0
[0.3.2]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.3.2
[0.3.1]: https://github.com/vocdoni/vocdoni-sdk/releases/tag/v0.3.1
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
