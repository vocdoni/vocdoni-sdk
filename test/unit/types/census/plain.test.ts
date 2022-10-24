import { CensusType, PlainCensus } from '../../../../src';
import { Wallet } from '@ethersproject/wallet';
import { computePublicKey } from '@ethersproject/signing-key';

let census: PlainCensus;

beforeEach(() => {
  census = new PlainCensus();
});

describe('Plain census tests', () => {
  it('should have the correct type', () => {
    expect(census).toBeInstanceOf(PlainCensus);
  });
  it('should not be published', () => {
    expect(census.isPublished).toBeFalsy();
  });
  it('should have the correct type', () => {
    expect(census.type).toBe(CensusType.WEIGHTED);
  });
  it('should add participants correctly', async () => {
    census.add(await Wallet.createRandom().getAddress());
    expect(census.participants.length).toEqual(1);

    census.add([
      computePublicKey(Wallet.createRandom().publicKey, true),
      computePublicKey(Wallet.createRandom().publicKey, true),
    ]);
    expect(census.participants.length).toEqual(3);

    const wallet = Wallet.createRandom();
    census.add([computePublicKey(wallet.publicKey, true), computePublicKey(wallet.publicKey, true)]);
    expect(census.participants.length).toEqual(4);
  });
  it('should throw when key is invalid', () => {
    expect(() => {
      census.add('this is nothing');
    }).toThrow('Added incorrect key to census');
    expect(() => {
      census.add(Wallet.createRandom().publicKey);
    }).toThrow('Added incorrect key to census');
  });
  it('should add participants weights correctly', () => {
    census.add([
      computePublicKey(Wallet.createRandom().publicKey, true),
      computePublicKey(Wallet.createRandom().publicKey, true),
      computePublicKey(Wallet.createRandom().publicKey, true),
    ]);
    census.participants.forEach(participant => expect(participant.weight).toEqual(BigInt(1)));
  });
  it('should remove participants correctly', () => {
    const wallet = Wallet.createRandom();
    census.add(computePublicKey(wallet.publicKey, true));
    expect(census.participants.length).toEqual(1);

    census.remove('');
    expect(census.participants.length).toEqual(1);

    census.remove(computePublicKey(wallet.publicKey, true));
    expect(census.participants.length).toEqual(0);

    census.remove(computePublicKey(wallet.publicKey, true));
    expect(census.participants.length).toEqual(0);
  });
});
