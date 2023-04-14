import { CensusType, PlainCensus } from '../../../../src';
import { Wallet } from '@ethersproject/wallet';

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

    census.add([Wallet.createRandom().address, Wallet.createRandom().address]);
    expect(census.participants.length).toEqual(3);

    const wallet = Wallet.createRandom();
    census.add([wallet.address, wallet.address]);
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
    census.add([Wallet.createRandom().address, Wallet.createRandom().address, Wallet.createRandom().address]);
    census.participants.forEach((participant) => expect(participant.weight).toEqual(BigInt(1)));
  });
  it('should remove participants correctly', () => {
    const wallet = Wallet.createRandom();
    census.add(wallet.address);
    expect(census.participants.length).toEqual(1);

    census.remove('');
    expect(census.participants.length).toEqual(1);

    census.remove(wallet.address);
    expect(census.participants.length).toEqual(0);

    census.remove(wallet.address);
    expect(census.participants.length).toEqual(0);
  });
});
