/**
 * Meetup & Direct 1-1 Chat HTTP service using cursor pagination and multipart uploads.
 */
import type { ChatAttachmentItem, ChatLocationData, ChatMessage } from '@/components/meetup/ChatBubble';
import { apiClient, toApiError } from '@/services/apiClient';
import type {
  ChatMessagePageParams,
  DirectChatMessageResponse,
  MeetupChatMessageResponse,
  ReactNativeUploadFile,
  SendChatMessageRequest,
  UUID,
} from '@/types/api';

async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toApiError(err);
  }
}

function normalizeCursorParams(params?: ChatMessagePageParams): ChatMessagePageParams | undefined {
  if (!params) return undefined;
  const query: ChatMessagePageParams = {};
  if (params.limit !== undefined) {
    query.limit = params.limit;
  }
  if (params.before && params.beforeId) {
    query.before = params.before;
    query.beforeId = params.beforeId;
  }
  return Object.keys(query).length > 0 ? query : undefined;
}

function buildMultipartPayload(payload: SendChatMessageRequest): FormData {
  const formData = new FormData();
  formData.append('clientMessageId', payload.clientMessageId);

  if (payload.text !== undefined && payload.text.trim().length > 0) {
    formData.append('text', payload.text.trim());
  }

  if (payload.files && payload.files.length > 0) {
    for (const file of payload.files) {
      if (typeof File !== 'undefined' && file instanceof File) {
        formData.append('files', file);
      } else {
        const rnFile = file as ReactNativeUploadFile;
        // React Native FormData expects { uri, name, type } object cast as Blob/File
        formData.append('files', {
          uri: rnFile.uri,
          name: rnFile.name,
          type: rnFile.type,
        } as unknown as Blob);
      }
    }
  }

  return formData;
}

async function postMultipart<T>(url: string, payload: SendChatMessageRequest): Promise<T> {
  const formData = buildMultipartPayload(payload);
  const { data } = await apiClient.post<T>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (body) => body,
  });
  return data;
}

export const chatService = {
  /** GET /meetups/:meetupId/chat/messages */
  listMeetupMessages(
    meetupId: UUID,
    params?: ChatMessagePageParams
  ): Promise<MeetupChatMessageResponse[]> {
    return call(async () => {
      const { data } = await apiClient.get<MeetupChatMessageResponse[]>(
        `/meetups/${encodeURIComponent(meetupId)}/chat/messages`,
        { params: normalizeCursorParams(params) }
      );
      return data;
    });
  },

  /** POST /meetups/:meetupId/chat/messages */
  sendMeetupMessage(
    meetupId: UUID,
    payload: SendChatMessageRequest
  ): Promise<MeetupChatMessageResponse> {
    return call(() =>
      postMultipart<MeetupChatMessageResponse>(
        `/meetups/${encodeURIComponent(meetupId)}/chat/messages`,
        payload
      )
    );
  },

  /** GET /chats/direct/:peerId/messages */
  listDirectMessages(
    peerId: UUID,
    params?: ChatMessagePageParams
  ): Promise<DirectChatMessageResponse[]> {
    return call(async () => {
      const { data } = await apiClient.get<DirectChatMessageResponse[]>(
        `/chats/direct/${encodeURIComponent(peerId)}/messages`,
        { params: normalizeCursorParams(params) }
      );
      return data;
    });
  },

  /** POST /chats/direct/:peerId/messages */
  sendDirectMessage(
    peerId: UUID,
    payload: SendChatMessageRequest
  ): Promise<DirectChatMessageResponse> {
    return call(() =>
      postMultipart<DirectChatMessageResponse>(
        `/chats/direct/${encodeURIComponent(peerId)}/messages`,
        payload
      )
    );
  },
};

function tryParseLocationText(text: string): ChatLocationData | undefined {
  const match = text.match(/maps\.google\.com\/\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i) ??
    text.match(/google\.com\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (!match) return undefined;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  return { latitude, longitude };
}

export function formatChatLocationText(location: ChatLocationData): string {
  const coords = `${location.latitude},${location.longitude}`;
  const url = `https://www.google.com/maps?q=${coords}`;
  return location.address ? `${location.address}\n${url}` : url;
}

export function toUploadFilesFromAttachments(
  attachments?: ChatAttachmentItem[]
): ReactNativeUploadFile[] | undefined {
  if (!attachments || attachments.length === 0) return undefined;
  const valid = attachments.filter((att) => Boolean(att.uri));
  if (valid.length === 0) return undefined;
  return valid.map((att) => ({
    uri: att.uri as string,
    name: att.fileName,
    type: att.mimeType || 'application/octet-stream',
  }));
}

export function mapApiChatMessageToUi(
  msg: MeetupChatMessageResponse | DirectChatMessageResponse,
  currentUserId: string,
  resolveUserName: (userId: string) => string
): ChatMessage {
  const isOwn = msg.senderUserId === currentUserId;
  const parsedLocation = tryParseLocationText(msg.textContent);
  return {
    id: msg.id,
    clientMessageId: msg.clientMessageId,
    userId: msg.senderUserId,
    userName: resolveUserName(msg.senderUserId),
    text: parsedLocation ? '' : msg.textContent,
    timestamp: new Date(msg.sentAt),
    status: 'sent',
    isOwn,
    location: parsedLocation,
    attachments:
      msg.attachments.length > 0
        ? msg.attachments.map((att, idx) => ({
            id: `${msg.id}_att_${idx}`,
            fileName: att.fileName,
            mimeType: att.mimeType,
            bytes: att.bytes,
            kind: att.mimeType.startsWith('image/') ? 'image' : 'file',
            uri: att.downloadUrl,
          }))
        : undefined,
  };
}

export function mergeChronologicalMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const byKey = new Map<string, ChatMessage>();
  const getKey = (m: ChatMessage) => m.clientMessageId || m.id;

  for (const item of existing) {
    byKey.set(getKey(item), item);
  }
  for (const item of incoming) {
    const k = getKey(item);
    const prev = byKey.get(k);
    // Server message ('sent') supersedes optimistic/pending item
    if (!prev || item.status === 'sent') {
      byKey.set(k, item);
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
}
