import { allocateSeats, DivisorMethod } from './party-list-tally';

/**
 * Mixed-Member Proportional (MMP) compensation — not a native Vocdoni
 * election type (see mmp.ts for why): it composes the results of two
 * *separate* native elections (local single-choice constituencies + one
 * list election) rather than being a ballot format at all.
 *
 * Each party's final seat count = however many local constituency seats it
 * won, plus enough "compensation" seats from its list result to bring its
 * total up to its proportional target (computed from the list vote via
 * D'Hondt/Sainte-Laguë — see `party-list-tally.ts`).
 *
 * Known simplification (documented, not fixed here): this implementation
 * does not handle "overhang" seats — the case where a party wins more local
 * constituencies than its proportional target entitles it to. Real MMP
 * systems handle this differently (Germany adds "leveling seats" to restore
 * proportionality for everyone else; New Zealand simply lets the total
 * chamber size grow). Picking one of those is a real policy decision, not a
 * technical default — left to whoever adapts this example.
 */

export interface MmpResult {
  perParty: Record<string, { local: number; target: number; compensation: number; total: number }>;
  totalSeats: number;
}

export function calculateMMP(
  localWinners: string[],
  listVotes: Record<string, number>,
  totalSeats: number,
  method: DivisorMethod
): MmpResult {
  const parties = Object.keys(listVotes);
  const votes = parties.map((p) => listVotes[p]);
  const targets = allocateSeats(votes, totalSeats, method);

  const localCounts: Record<string, number> = {};
  parties.forEach((p) => (localCounts[p] = 0));
  localWinners.forEach((p) => (localCounts[p] = (localCounts[p] ?? 0) + 1));

  const perParty: MmpResult['perParty'] = {};
  parties.forEach((p, i) => {
    const local = localCounts[p] ?? 0;
    const target = targets[i];
    const compensation = Math.max(0, target - local);
    perParty[p] = { local, target, compensation, total: local + compensation };
  });

  return { perParty, totalSeats: Object.values(perParty).reduce((sum, p) => sum + p.total, 0) };
}
