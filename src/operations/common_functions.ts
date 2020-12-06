import { MongoError } from '../error';
import { Callback, getTopology } from '../utils';
import type { Document } from '../bson';
import type { Db } from '../db';
import type { ClientSession } from '../sessions';
import type { ReadPreference } from '../read_preference';
import type { Collection } from '../collection';

/** @public */
export interface IndexInformationOptions {
  full?: boolean;
  readPreference?: ReadPreference;
  session?: ClientSession;
}
/**
 * Retrieves this collections index info.
 *
 * @param db - The Db instance on which to retrieve the index info.
 * @param name - The name of the collection.
 */
export function indexInformation(db: Db, name: string, callback: Callback): void;
export function indexInformation(
  db: Db,
  name: string,
  options: IndexInformationOptions,
  callback?: Callback
): void;
export function indexInformation(
  db: Db,
  name: string,
  _optionsOrCallback: IndexInformationOptions | Callback,
  _callback?: Callback
): void {
  let options = _optionsOrCallback as IndexInformationOptions;
  let callback = _callback as Callback;
  if ('function' === typeof _optionsOrCallback) {
    callback = _optionsOrCallback as Callback;
    options = {};
  }
  // If we specified full information
  const full = options.full == null ? false : options.full;

  // Did the user destroy the topology
  if (getTopology(db).isDestroyed()) return callback(new MongoError('topology was destroyed'));
  // Process all the results from the index command and collection
  function processResults(indexes: any) {
    // Contains all the information
    const info: any = {};
    // Process all the indexes
    for (let i = 0; i < indexes.length; i++) {
      const index = indexes[i];
      // Let's unpack the object
      info[index.name] = [];
      for (const name in index.key) {
        info[index.name].push([name, index.key[name]]);
      }
    }

    return info;
  }

  // Get the list of indexes of the specified collection
  db.collection(name)
    .listIndexes(options)
    .toArray((err?: any, indexes?: any) => {
      if (err) return callback(new MongoError(err));
      if (!Array.isArray(indexes)) return callback(undefined, []);
      if (full) return callback(undefined, indexes);
      callback(undefined, processResults(indexes));
    });
}

export function prepareDocs(
  coll: Collection,
  docs: Document[],
  options: { forceServerObjectId?: boolean }
): Document[] {
  const forceServerObjectId =
    typeof options.forceServerObjectId === 'boolean'
      ? options.forceServerObjectId
      : coll.s.db.options?.forceServerObjectId;

  // no need to modify the docs if server sets the ObjectId
  if (forceServerObjectId === true) {
    return docs;
  }

  return docs.map(doc => {
    if (doc._id == null) {
      doc._id = coll.s.pkFactory.createPk();
    }

    return doc;
  });
}
