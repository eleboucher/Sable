import { useCallback, useEffect, useMemo } from 'react';
import { Box, Spinner } from 'folds';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { ModalOverlay } from '$components/modal-overlay/ModalOverlay';
import { AsyncStatus, useAsyncCallback } from '$hooks/useAsyncCallback';
import { useCreateObjectURL } from '$hooks/useObjectURL';
import { useMatrixClient } from '$hooks/useMatrixClient';
import { useMediaAuthentication } from '$hooks/useMediaAuthentication';
import { useRenderableMediaUrl } from '$hooks/useRenderableMediaUrl';
import type { IImageInfo } from '$types/matrix/common';
import {
  decryptFile,
  downloadEncryptedMedia,
  mxcUrlToHttp,
  rewriteAuthenticatedMediaUrl,
} from '$utils/matrix';
import { FALLBACK_MIMETYPE } from '$utils/mimeTypes';
import { setMediaEncryption } from '$utils/tauriMediaEncryption';
import { isTauri } from '@tauri-apps/api/core';
import { ImageViewer } from './ImageViewer';

export type RoomMediaItem = {
  eventId: string;
  body: string;
  filename?: string;
  url: string;
  info?: IImageInfo;
  mimeType?: string;
  encInfo?: EncryptedAttachmentInfo;
};

type RoomMediaViewerProps = {
  items: RoomMediaItem[];
  selectedEventId: string;
  requestClose: () => void;
  selectEvent: (eventId: string) => void;
};

function ResolvedRoomMedia({
  item,
  requestClose,
  onPrevious,
  onNext,
}: {
  item: RoomMediaItem;
  requestClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const createObjectURL = useCreateObjectURL();
  const rawMediaUrl = useMemo(
    () => (item.url.startsWith('http') ? item.url : mxcUrlToHttp(mx, item.url, useAuthentication)),
    [item.url, mx, useAuthentication]
  );
  const resolvedMediaUrl = useRenderableMediaUrl(
    item.encInfo ? undefined : (rawMediaUrl ?? undefined)
  );
  const [source, loadSource] = useAsyncCallback(
    useCallback(async () => {
      if (item.encInfo) {
        if (!rawMediaUrl) throw new Error('Invalid media URL');
        if (isTauri()) {
          await setMediaEncryption(rawMediaUrl, item.encInfo, item.mimeType ?? FALLBACK_MIMETYPE);
          return rewriteAuthenticatedMediaUrl(rawMediaUrl)!;
        }
        return createObjectURL(
          downloadEncryptedMedia(rawMediaUrl, (buffer) =>
            decryptFile(buffer, item.mimeType ?? FALLBACK_MIMETYPE, item.encInfo!)
          )
        );
      }
      return resolvedMediaUrl ?? rawMediaUrl ?? item.url;
    }, [createObjectURL, item.encInfo, item.mimeType, item.url, rawMediaUrl, resolvedMediaUrl])
  );

  useEffect(() => {
    void loadSource().catch(() => undefined);
  }, [loadSource]);

  if (source.status !== AsyncStatus.Success) {
    return (
      <Box grow="Yes" alignItems="Center" justifyContent="Center" style={{ background: '#000' }}>
        <Spinner variant="Secondary" size="400" />
      </Box>
    );
  }

  return (
    <ImageViewer
      alt={item.body}
      filename={item.filename}
      src={source.data}
      info={item.info}
      requestClose={requestClose}
      onPrevious={onPrevious}
      onNext={onNext}
    />
  );
}

export function RoomMediaViewer({
  items,
  selectedEventId,
  requestClose,
  selectEvent,
}: RoomMediaViewerProps) {
  const selectedIndex = items.findIndex((item) => item.eventId === selectedEventId);
  const item = items[selectedIndex];

  if (!item) return null;

  return (
    <ModalOverlay open requestClose={requestClose} mobile="fullscreen">
      <ResolvedRoomMedia
        item={item}
        requestClose={requestClose}
        onPrevious={
          selectedIndex > 0 ? () => selectEvent(items[selectedIndex - 1]!.eventId) : undefined
        }
        onNext={
          selectedIndex < items.length - 1
            ? () => selectEvent(items[selectedIndex + 1]!.eventId)
            : undefined
        }
      />
    </ModalOverlay>
  );
}
