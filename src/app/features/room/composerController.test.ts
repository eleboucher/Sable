import { describe, expect, it } from 'vitest';
import { createComposerController } from './composerController';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('composer controller', () => {
  it('keeps a slow sticker ahead of a later GIF', async () => {
    const controller = createComposerController();
    const sticker = deferred<void>();
    const order: string[] = [];

    const stickerSend = controller.enqueue(async () => {
      order.push('sticker:start');
      await sticker.promise;
      order.push('sticker:end');
    });
    const gifSend = controller.enqueue(async () => {
      order.push('gif');
    });

    await Promise.resolve();
    expect(order).toEqual(['sticker:start']);
    sticker.resolve();
    await Promise.all([stickerSend, gifSend]);
    expect(order).toEqual(['sticker:start', 'sticker:end', 'gif']);
  });

  it('serializes picker sends before a subsequent Enter submission', async () => {
    const controller = createComposerController();
    const picker = deferred<void>();
    const order: string[] = [];

    const pickerSend = controller.enqueue(async () => {
      order.push('picker:start');
      await picker.promise;
      order.push('picker:end');
    });
    const enterSend = controller.enqueue(async () => {
      order.push('enter');
    });

    await Promise.resolve();
    expect(order).toEqual(['picker:start']);
    picker.resolve();
    await Promise.all([pickerSend, enterSend]);
    expect(order).toEqual(['picker:start', 'picker:end', 'enter']);
  });

  it('rejects stale cleanup after disposal', async () => {
    const controller = createComposerController();
    const completion = deferred<void>();
    let cleanupCount = 0;

    const send = controller.enqueue(async (context) => {
      await completion.promise;
      if (context.isCurrent()) cleanupCount += 1;
    });

    await Promise.resolve();
    controller.dispose();
    completion.resolve();
    await send;

    expect(cleanupCount).toBe(0);
  });

  it('advances the tail after a rejected operation', async () => {
    const controller = createComposerController();
    const success = { value: 'completed' };

    await expect(
      controller.enqueue(async () => {
        throw new Error('send failed');
      })
    ).rejects.toThrow('send failed');
    await expect(controller.enqueue(async () => success.value)).resolves.toBe(success.value);
  });
});
