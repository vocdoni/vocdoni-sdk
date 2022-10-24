import { Wallet } from '@ethersproject/wallet';
import { CensusType, WeightedCensus } from '../../../../src';
import { computePublicKey } from '@ethersproject/signing-key';

let census: WeightedCensus;

beforeEach(() => {
  census = new WeightedCensus();
});

describe('Weighted census tests', () => {
  it('should have the correct type', () => {
    expect(census).toBeInstanceOf(WeightedCensus);
  });
  it('should not be published', () => {
    expect(census.isPublished).toBeFalsy();
  });
  it('should have the correct type', () => {
    expect(census.type).toBe(CensusType.WEIGHTED);
  });
  it('should add participants correctly', () => {
    census.add({ key: computePublicKey(Wallet.createRandom().publicKey, true), weight: BigInt(1) });
    expect(census.participants.length).toEqual(1);

    census.add([
      { key: computePublicKey(Wallet.createRandom().publicKey, true), weight: BigInt(1) },
      { key: computePublicKey(Wallet.createRandom().publicKey, true), weight: BigInt(2) },
    ]);
    expect(census.participants.length).toEqual(3);

    const wallet = Wallet.createRandom();
    census.add([
      { key: computePublicKey(wallet.publicKey, true), weight: BigInt(1) },
      { key: computePublicKey(wallet.publicKey, true), weight: BigInt(2) },
    ]);
    expect(census.participants.length).toEqual(4);
  });
  it('should throw when key is invalid', () => {
    expect(() => {
      census.add({ key: Wallet.createRandom().publicKey, weight: BigInt(1) });
    }).toThrow('Added incorrect key to census');
  });
  it('should add participants weights correctly', () => {
    census.add([
      { key: computePublicKey(Wallet.createRandom().publicKey, true), weight: BigInt(1) },
      { key: computePublicKey(Wallet.createRandom().publicKey, true), weight: BigInt(2) },
    ]);
    expect(census.participants[0].weight).toEqual(BigInt(1));
    expect(census.participants[1].weight).toEqual(BigInt(2));
  });
  it('should remove participants correctly', () => {
    const wallet = Wallet.createRandom();
    census.add({ key: computePublicKey(wallet.publicKey, true), weight: BigInt(1) });
    expect(census.participants.length).toEqual(1);

    census.remove('');
    expect(census.participants.length).toEqual(1);

    census.remove(computePublicKey(wallet.publicKey, true));
    expect(census.participants.length).toEqual(0);

    census.remove(computePublicKey(wallet.publicKey, true));
    expect(census.participants.length).toEqual(0);
  });
});
