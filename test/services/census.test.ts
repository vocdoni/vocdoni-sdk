import { CensusService, CensusType, WeightedCensus, PlainCensus } from '../../src';
// @ts-ignore
import { URL } from './util/client.params';
import { Wallet } from '@ethersproject/wallet';
import { CENSUS_CHUNK_SIZE } from '../../src/util/constants';

const pad = (num, size) => {
  num = num.toString();
  while (num.length < size) num = '0' + num;
  return num;
};

let census, censusPublish;

describe('Census Service tests', () => {
  it('should have the correct type and properties', () => {
    const service = new CensusService({});
    expect(service).toBeInstanceOf(CensusService);
    expect(service.url).toBeUndefined();
    expect(service.auth).toBeUndefined();
  });
  it('should have set the correct parameters', async () => {
    const wallet = Wallet.createRandom();
    const service = new CensusService({ url: URL, auth: { identifier: 'test', wallet } });
    expect(service.url).toEqual(URL);
    expect(service.auth).toEqual({ identifier: 'test', wallet });
    await service.fetchAccountToken();
    expect(service.auth).toEqual({ identifier: 'test', wallet });
  });
  it('should fetch the auth information correctly', async () => {
    const service = new CensusService({ url: URL });
    expect(service.url).toBeDefined();
    expect(service.auth).toBeUndefined();
    await service.fetchAccountToken();
    expect(service.auth.identifier).toBeDefined();
    expect(service.auth.identifier.length).toBeGreaterThan(0);
    expect(service.auth.wallet).toBeInstanceOf(Wallet);
  });
  it('should create a census and return the correct information', async () => {
    const numVotes = 10;
    const service = new CensusService({ url: URL, chunk_size: CENSUS_CHUNK_SIZE });
    const census = new WeightedCensus();
    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());
    census.add(
      participants.map((participant, index) => ({
        key: participant.address,
        weight: BigInt(index + 1),
      }))
    );

    await service.createCensus(census);

    expect(census.censusId).toMatch(/^[0-9a-fA-F]{64}$/);
    expect(census.censusURI).toBeDefined();
    expect(census.type).toEqual(CensusType.WEIGHTED);
    expect(census.size).toEqual(numVotes);
    expect(census.weight).toEqual(BigInt(55));

    const censusInfo = await service.get(census.censusId);
    expect(censusInfo.type).toEqual(CensusType.WEIGHTED);
    expect(censusInfo.size).toEqual(10);
    expect(censusInfo.weight).toEqual(BigInt(55));
  }, 30000);
  it('should create a census by batches and return the correct information', async () => {
    const numVotes = 63;
    const service = new CensusService({ url: URL, chunk_size: 9 });
    const census = new PlainCensus();

    // Adding not random addresses for testing purposes
    census.participants = [...new Array(numVotes)].map((_v, i) => ({
      key: '0x' + pad(++i, 40),
      weight: BigInt(1),
    }));

    await service.createCensus(census);

    expect(census.censusId).toMatch(/^[0-9a-fA-F]{64}$/);
    expect(census.censusURI).toBeDefined();
    expect(census.type).toEqual(CensusType.WEIGHTED);
    expect(census.size).toEqual(numVotes);
    expect(census.weight).toEqual(BigInt(numVotes));

    const censusInfo = await service.get(census.censusId);
    expect(censusInfo.type).toEqual(CensusType.WEIGHTED);
    expect(censusInfo.size).toEqual(numVotes);
    expect(censusInfo.weight).toEqual(BigInt(numVotes));
  }, 40000);
  it('should create a big census by batches and return the correct information', async () => {
    const numVotes = 10000;
    const service = new CensusService({ url: URL, chunk_size: CENSUS_CHUNK_SIZE });
    const census = new PlainCensus();

    // Adding not random addresses for testing purposes
    census.participants = [...new Array(numVotes)].map((_v, i) => ({
      key: '0x' + pad(++i, 40),
      weight: BigInt(1),
    }));

    await service.createCensus(census);

    expect(census.censusId).toMatch(/^[0-9a-fA-F]{64}$/);
    expect(census.censusURI).toBeDefined();
    expect(census.type).toEqual(CensusType.WEIGHTED);
    expect(census.size).toEqual(numVotes);
    expect(census.weight).toEqual(BigInt(numVotes));

    const censusInfo = await service.get(census.censusId);
    expect(censusInfo.type).toEqual(CensusType.WEIGHTED);
    expect(censusInfo.size).toEqual(numVotes);
    expect(censusInfo.weight).toEqual(BigInt(numVotes));
  }, 40000);
  it('should create a census and export/import it correctly', async () => {
    const numVotes = 10;
    const service = new CensusService({ url: URL, chunk_size: CENSUS_CHUNK_SIZE });
    const participants: Wallet[] = [...new Array(numVotes)].map(() => Wallet.createRandom());

    census = await service.create(CensusType.WEIGHTED);
    const newCensus = await service.create(CensusType.WEIGHTED);

    await service.add(
      census.id,
      participants.map((p) => ({ key: p.address, weight: BigInt(1) }))
    );

    const exportedCensus = await service.export(census.id);
    await service.import(newCensus.id, exportedCensus);
    censusPublish = await service.publish(census.id);

    const censusInfo = await service.get(census.id);
    const newCensusInfo = await service.get(newCensus.id);

    expect(censusInfo.type).toEqual(newCensusInfo.type);
    expect(censusInfo.size).toEqual(newCensusInfo.size);
    expect(censusInfo.weight).toEqual(newCensusInfo.weight);
  }, 30000);
  it('should reuse a census, modify it and publish it again', async () => {
    if (!census) {
      return;
    }
    const service = new CensusService({ url: URL, chunk_size: CENSUS_CHUNK_SIZE, auth: { identifier: census.auth } });
    const oldCensusInfo = await service.get(census.id);

    await service.add(census.id, [{ key: Wallet.createRandom().address, weight: BigInt(1) }]);

    const newCensusPublish = await service.publish(census.id);
    const newCensusInfo = await service.get(census.id);

    expect(newCensusInfo.type).toEqual(oldCensusInfo.type);
    expect(newCensusInfo.size).toEqual(oldCensusInfo.size + 1);
    expect(newCensusInfo.weight).toEqual(oldCensusInfo.weight + BigInt(1));
    expect(newCensusPublish.uri).not.toEqual(censusPublish.uri);
  }, 30000);
  it('should delete an existing census', async () => {
    if (!census) {
      return;
    }
    const service = new CensusService({ url: URL, chunk_size: CENSUS_CHUNK_SIZE, auth: { identifier: census.auth } });
    const oldCensusInfo = await service.get(census.id);
    await service.delete(census.id);
    const newCensusInfo = await service.get(census.id);

    expect(oldCensusInfo.type).toBeDefined();
    expect(oldCensusInfo.size).toBeDefined();
    expect(oldCensusInfo.weight).toBeDefined();

    expect(newCensusInfo.type).toBeUndefined();
    expect(newCensusInfo.size).toBeUndefined();
    expect(newCensusInfo.weight).toBeUndefined();
  }, 30000);
});
