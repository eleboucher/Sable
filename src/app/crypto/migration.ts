import type { IMegolmSessionData } from 'matrix-js-sdk/lib/@types/crypto';
import { createDebugLogger } from '$utils/debugLogger';
import * as engine from './engineClient';

const migrationLog = createDebugLogger('rust-crypto-migration');

/**
 * A crypto implementation we can take room keys out of — either js-sdk's wasm
 * crypto (during migration) or the IPC adapter (for tests and re-runs).
 */
export type RoomKeySource = {
  exportRoomKeys: () => Promise<IMegolmSessionData[]>;
};

export type KeyHandoverResult = {
  /** Sessions the old device offered. */
  exported: number;
  /** Sessions the engine accepted; lower than `exported` for duplicates. */
  imported: number;
  batches: number;
};

/**
 * Moving to the Rust engine means a new Olm account, which means a new device:
 * matrix-sdk-crypto-wasm cannot export its account, and a homeserver will not
 * let a second account claim an existing device id. Re-authentication is
 * therefore unavoidable.
 *
 * What is avoidable is losing history. The old device's store holds every
 * inbound group session it ever received, which is a superset of what server-side
 * key backup has, so handing those sessions straight to the engine keeps history
 * readable — including sessions that were never backed up.
 *
 * Batched because a long-lived account holds thousands of sessions and the whole
 * export would otherwise cross the IPC bridge as one multi-megabyte string.
 */
export async function handOverRoomKeys(
  source: RoomKeySource,
  identity: engine.EngineIdentity,
  options: { batchSize?: number } = {}
): Promise<KeyHandoverResult> {
  const batchSize = options.batchSize ?? 500;
  if (batchSize < 1) throw new Error('batchSize must be at least 1');

  const keys = await source.exportRoomKeys();
  let imported = 0;
  let batches = 0;

  for (let offset = 0; offset < keys.length; offset += batchSize) {
    const batch = keys.slice(offset, offset + batchSize);
    // Sequential: each batch is a separate IPC round trip, and running them
    // concurrently would defeat the point of bounding peak payload size.
    // eslint-disable-next-line no-await-in-loop
    const result = await engine.importRoomKeys({ ...identity, keys: batch });
    imported += result.imported_count;
    batches += 1;
  }

  migrationLog.info(
    'general',
    `Handed over ${imported}/${keys.length} room keys in ${batches} batches`
  );

  return { exported: keys.length, imported, batches };
}
