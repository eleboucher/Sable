/* oxlint-disable typescript/no-explicit-any, typescript/no-extraneous-class, unicorn/consistent-function-scoping, vitest/require-mock-type-parameters */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, type ReactNode } from 'react';
import { useAtom } from 'jotai';
import { createEditor, Transforms } from 'slate';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomInput } from './RoomInput';
import {
  roomIdToMsgDraftAtomFamily,
  roomIdToUploadItemsAtomFamily,
} from '$state/room/roomInputDrafts';
import {
  roomIdToEditingScheduledDelayIdAtomFamily,
  roomIdToScheduledTimeAtomFamily,
} from '$state/scheduledMessages';

const testState = vi.hoisted(() => ({
  isMobile: false,
  matrix: {
    sendMessage: vi.fn(),
    getUserId: vi.fn(() => '@me:example.org'),
    getSafeUserId: vi.fn(() => '@me:example.org'),
  },
  cancelDelayedEvent: vi.fn(),
  sendDelayedMessage: vi.fn(),
  pendingUploads: [] as unknown[],
  editingEvent: undefined as
    | { getId: () => string; getContent: () => Record<string, unknown> }
    | undefined,
}));

vi.mock('$hooks/useMatrixClient', () => ({
  useMatrixClient: () => testState.matrix,
}));

vi.mock('$utils/platform', () => ({
  isMobileOrTablet: () => testState.isMobile,
  isMobileTauri: () => false,
}));

vi.mock('$state/hooks/settings', () => ({
  useSetting: (_atom: unknown, key: string) => {
    const values: Record<string, unknown> = {
      enterForNewline: false,
      editorGifButton: false,
      editorEmojiButton: false,
      editorStickerButton: false,
      editorMicButton: false,
      editorButtonOrder: [],
      shortcutOverrides: {},
      hideActivity: true,
      mentionInReplies: true,
      pkCompat: false,
      pmpProxying: false,
      pmpPicker: false,
      hour24Clock: false,
      enableMediaGalleries: false,
      sendIndividualAttachmentAsCaption: false,
    };
    return [values[key], vi.fn()];
  },
}));

vi.mock('$state/settings', () => ({ settingsAtom: {} }));

vi.mock('$state/room/roomInputDrafts', async () => {
  const { atom } = await import('jotai');
  const msgDraftAtom = atom([]);
  const replyDraftAtom = atom(undefined);
  const uploadItemsAtom = atom<unknown[], [unknown], void>([], (get, set, action) => {
    const update = action as any;
    if (Array.isArray(update)) {
      set(uploadItemsAtom, update);
      return;
    }
    if (update?.type === 'PUT') set(uploadItemsAtom, [...get(uploadItemsAtom), ...update.item]);
    if (update?.type === 'DELETE') {
      const deleted = new Set(update.item);
      set(
        uploadItemsAtom,
        get(uploadItemsAtom).filter((item: any) => !deleted.has(item))
      );
    }
  });
  const scheduledTimeAtom = atom(null);
  const editingScheduledDelayIdAtom = atom(null);
  return {
    roomIdToMsgDraftAtomFamily: () => msgDraftAtom,
    roomIdToReplyDraftAtomFamily: () => replyDraftAtom,
    roomIdToUploadItemsAtomFamily: () => uploadItemsAtom,
    roomUploadAtomFamily: Object.assign(() => atom(undefined), { remove: vi.fn() }),
    roomIdToScheduledTimeAtomFamily: () => scheduledTimeAtom,
    roomIdToEditingScheduledDelayIdAtomFamily: () => editingScheduledDelayIdAtom,
  };
});

vi.mock('$state/upload', async () => {
  const { atom } = await import('jotai');
  const observerAtom = atom([]);
  return {
    UploadStatus: { Loading: 'loading', Success: 'success' },
    createUploadFamilyObserverAtom: () => observerAtom,
  };
});

vi.mock('$components/editor', () => {
  const textOf = (nodes: any[]) =>
    nodes
      .map((node) => (node.children ?? []).map((child: any) => child.text ?? '').join(''))
      .join('\n');
  const passthrough = ({ children }: { children?: unknown }) => children ?? null;
  const CustomEditor = ({
    editableName,
    editor,
    onChange,
    onKeyDown,
    before,
    top,
    after,
    bottom,
  }: any) => (
    <div>
      {top}
      {before}
      <div
        data-editable-name={editableName}
        data-testid={editableName === 'RoomInput' ? 'room-input-editor' : undefined}
        data-editor-text={editableName === 'RoomInput' ? textOf(editor.children) : undefined}
        contentEditable
        role="textbox"
        aria-label="Room message"
        tabIndex={0}
        onInput={onChange}
        onKeyDown={onKeyDown}
      />
      {after}
      {bottom}
    </div>
  );
  return {
    AutocompletePrefix: {
      RoomMention: 'room-mention',
      UserMention: 'user-mention',
      Emoticon: 'emoticon',
      Reaction: 'reaction',
      Command: 'command',
    },
    ANYWHERE_AUTOCOMPLETE_PREFIXES: [],
    BEGINNING_AUTOCOMPLETE_PREFIXES: [],
    BlockType: { Paragraph: 'paragraph' },
    Command: {},
    CustomEditor,
    EmoticonAutocomplete: passthrough,
    MarkdownFormattingToolbarBottom: passthrough,
    MarkdownFormattingToolbarToggle: passthrough,
    RoomMentionAutocomplete: passthrough,
    UserMentionAutocomplete: passthrough,
    createEmoticonElement: () => ({ text: '' }),
    customHtmlEqualsPlainText: (html: string, text: string) => html === text,
    focusEditor: vi.fn(),
    getAutocompleteQuery: vi.fn(),
    getBeginCommand: () => undefined,
    getLinks: () => [],
    getMentions: () => ({ users: new Set<string>(), room: undefined }),
    getPrevWorldRange: () => undefined,
    isEmptyEditor: (editor: any) => textOf(editor.children).trim() === '',
    moveCursor: vi.fn(),
    plainToEditorInput: (text: string) => [{ type: 'paragraph', children: [{ text }] }],
    replaceWithElement: vi.fn(),
    resetEditor: (editor: any) => {
      editor.children = [{ type: 'paragraph', children: [{ text: '' }] }];
      editor.selection = null;
    },
    resetEditorHistory: vi.fn(),
    toMatrixCustomHTML: (nodes: any[]) => textOf(nodes),
    toPlainText: textOf,
    trimCommand: (_command: unknown, text: string) => text,
    trimCustomHtml: (html: string) => html,
  };
});

vi.mock('$components/upload-board', async () => {
  const UploadBoardHeader = ({ imperativeHandlerRef, onSend }: any) => {
    useImperativeHandle(
      imperativeHandlerRef,
      () => ({
        handleSend: () => onSend(testState.pendingUploads),
      }),
      [onSend]
    );
    return null;
  };
  const UploadBoard = ({ header, children }: any) => (
    <>
      {header}
      {children}
    </>
  );
  return {
    UploadBoard,
    UploadBoardContent: ({ children }: any) => <>{children}</>,
    UploadBoardHeader,
  };
});

vi.mock('$components/upload-card', () => ({ UploadCardRenderer: () => null }));
vi.mock('$components/attachment-sheet/AttachmentSheet', () => ({ AttachmentSheet: () => null }));
vi.mock('$components/emoji-board', () => ({ EmojiBoard: () => null, EmojiBoardTab: {} }));
vi.mock('$components/UseStateProvider', () => ({
  UseStateProvider: ({ children }: any) => (typeof children === 'function' ? children() : children),
}));
vi.mock('$components/message', () => ({ Reply: () => null, ThreadIndicator: () => null }));
vi.mock('./CommandAutocomplete', () => ({ CommandAutocomplete: () => null }));
vi.mock('./AudioMessageRecorder', () => ({ AudioMessageRecorder: () => null }));
vi.mock('./persona-picker/PersonaPicker', () => ({ PersonaPicker: () => null }));
vi.mock('./schedule-send', () => ({ SchedulePickerDialog: () => null }));
vi.mock('./poll-modals', () => ({ PollDialog: () => null }));
vi.mock('$components/icons/phosphor', () => {
  const Icon = forwardRef<HTMLButtonElement, { children?: ReactNode }>(({ children }, ref) => (
    <button ref={ref}>{children}</button>
  ));
  return {
    Bell: Icon,
    BellSlash: Icon,
    CaretDown: Icon,
    Clock: Icon,
    File: Icon,
    Gif: Icon,
    Image: Icon,
    ListBullets: Icon,
    MapPinPlusIcon: Icon,
    Microphone: Icon,
    PaperPlaneTilt: Icon,
    PencilSimple: Icon,
    PlusCircle: Icon,
    Smiley: Icon,
    Sticker: Icon,
    Stop: Icon,
    X: Icon,
    chipIcon: () => null,
    composerIcon: () => null,
    dropzoneIcon: () => null,
    getPhosphorIconSize: () => 16,
    menuIcon: () => null,
  };
});

vi.mock('folds', () => {
  const Box = ({ children }: any) => <div>{children}</div>;
  const Button = forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
    <button ref={ref} {...props}>
      {children}
    </button>
  ));
  const passthrough = ({ children }: any) => <>{children}</>;
  return {
    Box,
    Dialog: passthrough,
    IconButton: Button,
    Menu: passthrough,
    MenuItem: Button,
    Overlay: passthrough,
    OverlayBackdrop: () => null,
    OverlayCenter: passthrough,
    PopOut: ({ children }: any) => <>{children}</>,
    Scroll: passthrough,
    Spinner: () => <span>Sending</span>,
    Text: ({ children }: any) => <span>{children}</span>,
    color: { Critical: { Main: 'red' } },
    config: { space: { S100: '1px', S200: '2px', S300: '3px' } },
    toRem: (value: number) => `${value / 16}rem`,
  };
});

vi.mock('$hooks/useTypingStatusUpdater', () => ({ useTypingStatusUpdater: () => vi.fn() }));
vi.mock('$hooks/useFilePicker', () => ({ useFilePicker: () => vi.fn() }));
vi.mock('$hooks/useFilePasteHandler', () => ({ useFilePasteHandler: () => vi.fn() }));
vi.mock('$hooks/useFileDrop', () => ({ useFileDropZone: () => false }));
vi.mock('$hooks/useCommands', () => ({
  Command: {},
  SHRUG: '¯\\_(ツ)_/¯',
  TABLEFLIP: '(╯°□°）╯︵ ┻━┻',
  UNFLIP: '┬─┬ノ( º _ ºノ)',
  useCommands: () => ({}),
}));
vi.mock('$hooks/useClientConfig', () => ({ useClientConfig: () => ({}) }));
vi.mock('$hooks/useMediaAuthentication', () => ({ useMediaAuthentication: () => false }));
vi.mock('$hooks/useImagePackRooms', () => ({ useImagePackRooms: () => [] }));
vi.mock('$hooks/useComposingCheck', () => ({ useComposingCheck: () => () => false }));
vi.mock('$hooks/usePerMessageProfile', () => ({
  convertPerMessageProfileToBeeperFormat: () => ({}),
  getCurrentlyUsedPerMessageProfileForAccount: async () => undefined,
  getCurrentlyUsedPerMessageProfileForRoom: async () => undefined,
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('$hooks/usePowerLevels', () => ({
  usePowerLevelsContext: () => ({}),
  useRoomPermissions: () => ({ event: () => true }),
}));
vi.mock('$hooks/useRoomPermissions', () => ({ useRoomPermissions: () => ({ event: () => true }) }));
vi.mock('$hooks/useRoomCreators', () => ({ useRoomCreators: () => [] }));
vi.mock('$features/settings/useSettingsLinkBaseUrl', () => ({ useSettingsLinkBaseUrl: () => '' }));
vi.mock('$state/room/roomToParents', async () => {
  const { atom } = await import('jotai');
  return { roomToParentsAtom: atom({}) };
});
vi.mock('$state/nicknames', async () => {
  const { atom } = await import('jotai');
  return { nicknamesAtom: atom({}) };
});
vi.mock('$state/scheduledMessages', async () => {
  const { atom } = await import('jotai');
  const scheduledTimeAtom = atom(null);
  const editingScheduledDelayIdAtom = atom(null);
  return {
    delayedEventsSupportedAtom: atom(false),
    roomIdToScheduledTimeAtomFamily: () => scheduledTimeAtom,
    roomIdToEditingScheduledDelayIdAtomFamily: () => editingScheduledDelayIdAtom,
    serverMaxDelayMsAtom: atom(null),
  };
});
vi.mock('$utils/matrix', () => ({
  cancelUploadContent: vi.fn(),
  encryptFile: vi.fn(),
  getImageInfo: vi.fn(),
  mxcUrlToHttp: vi.fn(),
  toggleReaction: vi.fn(),
}));
vi.mock('$utils/mimeTypes', () => ({
  FALLBACK_MIMETYPE: 'application/octet-stream',
  TGS_MIMETYPE: 'application/x-tgsticker',
  isImageMimeType: () => false,
  safeUploadFile: async (file: File) => file,
}));
vi.mock('$utils/dom', () => ({ loadImageElementFromMediaUrl: vi.fn() }));
vi.mock('$utils/common', () => ({
  fulfilledPromiseSettledResult: (results: any[]) =>
    results.filter((result) => result.status === 'fulfilled').map((result) => result.value),
}));
vi.mock('$utils/room/relations', () => ({
  getEditedEvent: vi.fn(),
  getMentionContent: () => ({ user_ids: [] }),
  getThreadReplyEvents: () => [],
}));
vi.mock('$plugins/markdown', () => ({ htmlToMarkdown: (html: string) => html }));
vi.mock('$utils/delayedEvents', () => ({
  cancelDelayedEvent: testState.cancelDelayedEvent,
  computeDelayMs: vi.fn(),
  sendDelayedMessage: testState.sendDelayedMessage,
  sendDelayedMessageE2EE: vi.fn(),
}));
vi.mock('$utils/time', () => ({
  daysToMs: () => 1,
  timeDayMonthYear: () => '',
  timeHourMinute: () => '',
}));
vi.mock('$utils/keyboard', () => ({ stopPropagation: vi.fn() }));
vi.mock('$utils/debug', () => ({ createLogger: () => ({ error: vi.fn(), warn: vi.fn() }) }));
vi.mock('$utils/debugLogger', () => ({
  createDebugLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));
vi.mock('$plugins/pluralkit-handler/PKitCommandMessageHandler', () => ({
  PKitCommandMessageHandler: class {
    static isPKCommand() {
      return false;
    }
  },
}));
vi.mock('$plugins/pluralkit-handler/PKitProxyMessageHandler', () => ({
  PKitProxyMessageHandler: class {
    init() {}
    async getPmpBasedOnMessage() {
      return undefined;
    }
  },
}));
vi.mock('$sentry/react', () => ({
  metrics: { count: vi.fn(), distribution: vi.fn() },
  startSpan: (_options: unknown, callback: () => unknown) => callback(),
}));

const room = {
  roomId: '!room:example.org',
  name: 'Test room',
  hasEncryptionStateEvent: () => false,
  findEventById: (eventId: string) =>
    eventId === testState.editingEvent?.getId() ? testState.editingEvent : undefined,
  getTimelineForEvent: () => undefined,
  getMember: () => undefined,
  getLiveTimeline: () => ({ getEvents: () => [] }),
} as any;

function RoomInputHarness({
  editId,
  onCancelEdit,
  scheduled = false,
}: {
  editId?: string;
  onCancelEdit?: () => void;
  scheduled?: boolean;
}) {
  const editor = useMemo(() => {
    const nextEditor = createEditor();
    nextEditor.children = [{ type: 'paragraph' as any, children: [{ text: '' }] }];
    return nextEditor;
  }, []);
  const fileDropContainerRef = useMemo(() => ({ current: null }), []);
  const [, setMsgDraft] = useAtom(roomIdToMsgDraftAtomFamily(room.roomId));
  const [, setSelectedFiles] = useAtom(roomIdToUploadItemsAtomFamily(room.roomId));
  const [, setScheduledTime] = useAtom(roomIdToScheduledTimeAtomFamily(room.roomId));
  const [, setEditingScheduledDelayId] = useAtom(
    roomIdToEditingScheduledDelayIdAtomFamily(room.roomId)
  );
  useEffect(() => {
    (setMsgDraft as any)([]);
    (setSelectedFiles as any)([]);
    setScheduledTime(null);
    setEditingScheduledDelayId(null);
  }, [setEditingScheduledDelayId, setMsgDraft, setScheduledTime, setSelectedFiles]);
  const setText = () => {
    editor.children = [{ type: 'paragraph' as any, children: [{ text: '' }] }];
    Transforms.select(editor, { path: [0, 0], offset: 0 });
    Transforms.insertText(editor, 'retry me');
    fireEvent.input(screen.getByTestId('room-input-editor'));
  };
  return (
    <>
      <button type="button" onClick={setText}>
        Compose text
      </button>
      <button
        type="button"
        onClick={() => {
          const upload = testState.pendingUploads[0] as any;
          const file =
            upload?.file ?? new File(['attachment'], 'attachment.txt', { type: 'text/plain' });
          if (!upload) {
            testState.pendingUploads = [
              {
                status: 'loading',
                file,
                promise: Promise.resolve({ content_uri: 'mxc://example/attachment' }),
              },
            ];
          }
          setSelectedFiles({
            type: 'PUT',
            item: [
              {
                file,
                originalFile: file,
                encInfo: undefined,
                metadata: { markedAsSpoiler: false },
              },
            ],
          });
        }}
      >
        Prepare attachment
      </button>
      <button
        type="button"
        onClick={() => {
          const files = [
            new File(['first'], 'first.txt', { type: 'text/plain' }),
            new File(['second'], 'second.txt', { type: 'text/plain' }),
          ];
          testState.pendingUploads = files.map((file, index) => ({
            status: 'success',
            file,
            mxc: `mxc://example/${index}`,
          }));
          setSelectedFiles({
            type: 'PUT',
            item: files.map((file) => ({
              file,
              originalFile: file,
              encInfo: undefined,
              metadata: { markedAsSpoiler: false },
            })),
          });
          if (scheduled) {
            setScheduledTime(new Date('2026-07-28T12:00:00.000Z'));
            setEditingScheduledDelayId('$scheduled-delay');
          }
        }}
      >
        Prepare two attachments
      </button>
      <RoomInput
        editor={editor}
        fileDropContainerRef={fileDropContainerRef}
        roomId={room.roomId}
        room={room}
        editId={editId}
        onCancelEdit={onCancelEdit}
      />
    </>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  testState.isMobile = false;
  testState.pendingUploads = [];
  testState.editingEvent = undefined;
  testState.matrix.sendMessage.mockReset().mockResolvedValue({ event_id: '$event' });
  testState.cancelDelayedEvent.mockReset();
  testState.sendDelayedMessage.mockReset();
});

describe('RoomInput submit regressions', () => {
  it('sends only once when submitted twice before the first send resolves', async () => {
    const send = deferred<{ event_id: string }>();
    testState.matrix.sendMessage.mockReturnValue(send.promise);
    render(<RoomInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Prepare attachment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compose text' }));

    const submit = screen.getByRole('button', { name: 'Send your composed Message' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(testState.matrix.sendMessage).toHaveBeenCalledOnce());
    send.resolve({ event_id: '$event' });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Send your composed Message' })).toBeEnabled()
    );
  });

  it('waits for an attachment transaction instead of sending text independently', async () => {
    const upload = deferred<{ content_uri: string }>();
    const file = new File(['attachment'], 'attachment.txt', { type: 'text/plain' });
    testState.pendingUploads = [{ status: 'loading', file, promise: upload.promise }];

    render(<RoomInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Prepare attachment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compose text' }));

    fireEvent.click(screen.getByRole('button', { name: 'Send your composed Message' }));
    expect(testState.matrix.sendMessage).not.toHaveBeenCalled();
    upload.resolve({ content_uri: 'mxc://example/attachment' });
    await waitFor(() => expect(testState.matrix.sendMessage).toHaveBeenCalledTimes(2));
    expect(testState.matrix.sendMessage.mock.calls[0]?.[2]?.body).toBe('attachment.txt');
    expect(testState.matrix.sendMessage.mock.calls[1]?.[2]?.body).toBe('retry me');
  });

  it('keeps attachment retry locked until every sibling send settles', async () => {
    const delayedSecondSend = deferred<{ event_id: string }>();
    let sendNumber = 0;
    testState.matrix.sendMessage.mockImplementation(() => {
      sendNumber += 1;
      return sendNumber === 1
        ? Promise.reject(new Error('first attachment failed'))
        : delayedSecondSend.promise;
    });

    render(<RoomInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Prepare two attachments' }));
    const submit = screen.getByRole('button', { name: 'Send your composed Message' });
    fireEvent.keyDown(screen.getByTestId('room-input-editor'), { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(testState.matrix.sendMessage).toHaveBeenCalledTimes(2));
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(testState.matrix.sendMessage).toHaveBeenCalledTimes(2);

    delayedSecondSend.resolve({ event_id: '$second' });
    await waitFor(() => expect(submit).toBeEnabled());
    expect(testState.matrix.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('waits for all scheduled siblings before unlocking and does not re-cancel on retry', async () => {
    const delayedSecondSend = deferred<unknown>();
    let sendNumber = 0;
    testState.sendDelayedMessage.mockImplementation(() => {
      sendNumber += 1;
      if (sendNumber === 1) return Promise.reject(new Error('first scheduled send failed'));
      if (sendNumber === 2) return delayedSecondSend.promise;
      return Promise.resolve();
    });

    render(<RoomInputHarness scheduled />);
    fireEvent.click(screen.getByRole('button', { name: 'Prepare two attachments' }));
    const submit = screen.getByRole('button', { name: 'Send your composed Message' });
    fireEvent.keyDown(screen.getByTestId('room-input-editor'), { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(testState.sendDelayedMessage).toHaveBeenCalledTimes(2));
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(testState.sendDelayedMessage).toHaveBeenCalledTimes(2);

    delayedSecondSend.resolve(undefined);
    await waitFor(() => expect(submit).toBeEnabled());
    expect(testState.cancelDelayedEvent).toHaveBeenCalledOnce();

    testState.pendingUploads = [testState.pendingUploads[0]];
    fireEvent.click(submit);
    await waitFor(() => expect(testState.sendDelayedMessage).toHaveBeenCalledTimes(3));
    expect(testState.cancelDelayedEvent).toHaveBeenCalledOnce();
  });

  it('keeps composed text after a failed send so it can be retried', async () => {
    testState.matrix.sendMessage
      .mockRejectedValueOnce(new Error('send failed'))
      .mockResolvedValue({ event_id: '$event' });
    render(<RoomInputHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Compose text' }));
    const submit = screen.getByRole('button', { name: 'Send your composed Message' });

    fireEvent.click(submit);
    await waitFor(() => expect(testState.matrix.sendMessage).toHaveBeenCalledOnce());
    expect(screen.getByTestId('room-input-editor')).toHaveAttribute('data-editor-text', 'retry me');

    fireEvent.click(submit);
    await waitFor(() => expect(testState.matrix.sendMessage).toHaveBeenCalledTimes(2));
  });

  it('does not submit mobile edits before initialization, then sends the replacement', async () => {
    testState.isMobile = true;
    testState.editingEvent = {
      getId: () => '$original',
      getContent: () => ({ body: 'original', msgtype: 'm.text' }),
    };
    const onCancelEdit = vi.fn();
    render(<RoomInputHarness editId="$original" onCancelEdit={onCancelEdit} />);

    expect(testState.matrix.sendMessage).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('room-input-editor')).toBeInTheDocument());
    fireEvent.input(screen.getByTestId('room-input-editor'));
    fireEvent.click(screen.getByRole('button', { name: 'Send your composed Message' }));

    await waitFor(() => expect(testState.matrix.sendMessage).toHaveBeenCalledOnce());
    expect(testState.matrix.sendMessage).toHaveBeenCalledWith(
      room.roomId,
      expect.objectContaining({
        body: '* original',
        'm.new_content': expect.objectContaining({ body: 'original' }),
        'm.relates_to': expect.anything(),
      })
    );
    expect(onCancelEdit).toHaveBeenCalledOnce();
  });
});
