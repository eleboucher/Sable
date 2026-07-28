export interface ComposerOperationContext {
  operationId: number;
  generation: number;
  isCurrent: () => boolean;
}

export type ComposerOperation<T> = (context: ComposerOperationContext) => T | Promise<T>;

export interface ComposerController {
  enqueue<T>(operation: ComposerOperation<T>): Promise<T | undefined>;
  dispose(): void;
}

export const createComposerController = (): ComposerController => {
  let queueTail: Promise<void> = Promise.resolve();
  let disposed = false;
  let generation = 0;
  let nextOperationId = 0;
  let currentOperationId: number | undefined;

  const enqueue = <T>(operation: ComposerOperation<T>): Promise<T | undefined> => {
    const operationId = ++nextOperationId;
    const operationGeneration = generation;

    return new Promise<T | undefined>((resolve, reject) => {
      const run = async () => {
        if (disposed || operationGeneration !== generation) {
          resolve(undefined);
          return;
        }

        currentOperationId = operationId;
        const context: ComposerOperationContext = {
          operationId,
          generation: operationGeneration,
          isCurrent: () =>
            !disposed && generation === operationGeneration && currentOperationId === operationId,
        };

        try {
          resolve(await operation(context));
        } catch (error) {
          reject(error);
        } finally {
          if (currentOperationId === operationId) currentOperationId = undefined;
        }
      };

      queueTail = queueTail.then(run, run).then(
        () => undefined,
        () => undefined
      );
    });
  };

  return {
    enqueue,
    dispose: () => {
      disposed = true;
      generation += 1;
      currentOperationId = undefined;
    },
  };
};
