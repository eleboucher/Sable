export type RoomScheduleOperation<T> = () => T | PromiseLike<T>;

type QueueTail = Promise<void>;

const queueTails = new Map<string, QueueTail>();

function run<T>(roomId: string, operation: RoomScheduleOperation<T>): Promise<T> {
  const previous = queueTails.get(roomId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  const tail = current.then(
    () => undefined,
    () => undefined
  );

  queueTails.set(roomId, tail);
  void tail.then(() => {
    if (queueTails.get(roomId) === tail) queueTails.delete(roomId);
  });

  return current;
}

/** Serializes delayed-event mutations for each room without blocking other rooms. */
export const roomScheduleCoordinator = { run };
