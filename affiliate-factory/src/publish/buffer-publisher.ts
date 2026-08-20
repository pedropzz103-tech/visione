import {
  PublishReceiptSchema,
  type PublicationChannel,
  type PublishReceipt,
  type PublishRequest
} from '../contracts/index.js';
import type {Publisher} from './publisher.js';

const BUFFER_API_URL = 'https://api.buffer.com';

const CREATE_POST_MUTATION = `
mutation CreateAffiliatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess {
      post { id status dueAt assets { source } }
    }
    ... on MutationError { message }
  }
}`;

const VALIDATE_CHANNEL_QUERY = `
query ValidateAffiliateChannel($organizationId: OrganizationId!) {
  channels(input: {organizationId: $organizationId}) {
    id name service isQueuePaused
  }
}`;

export type BufferChannel = {
  id: string;
  name: string;
  service: string;
  isQueuePaused: boolean;
};

export type BufferPublisherOptions = {
  apiKey: string;
  channelId: string;
  organizationId: string;
  channel: PublicationChannel;
  expectedService: 'tiktok' | 'twitter' | 'threads';
  fetchFn?: typeof fetch;
  now?: () => Date;
};

function postText(request: PublishRequest): string {
  const base = request.caption.trim();
  return base.includes(request.affiliateUrl)
    ? base
    : `${base}\n\n${request.affiliateUrl}`;
}

function receipt(
  request: PublishRequest,
  now: () => Date,
  values: Pick<PublishReceipt, 'status' | 'message'> & {providerPostId?: string}
): PublishReceipt {
  return PublishReceiptSchema.parse({
    schemaVersion: '1.0.0',
    publicationKey: request.publicationKey,
    provider: 'buffer',
    channel: request.channel,
    status: values.status,
    ...(values.providerPostId ? {providerPostId: values.providerPostId} : {}),
    message: values.message,
    createdAt: now().toISOString(),
    mediaUrls: request.assets.map((asset) => asset.url)
  });
}

export class BufferPublisher implements Publisher {
  readonly #fetch: typeof fetch;
  readonly #now: () => Date;

  public constructor(private readonly options: BufferPublisherOptions) {
    this.#fetch = options.fetchFn ?? fetch;
    this.#now = options.now ?? (() => new Date());
  }

  async #graphql(query: string, variables: Record<string, unknown>): Promise<Response> {
    return this.#fetch(BUFFER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.options.apiKey}`
      },
      body: JSON.stringify({query, variables})
    });
  }

  public async publish(request: PublishRequest): Promise<PublishReceipt> {
    if (request.channel !== this.options.channel) {
      throw new Error('BUFFER_CHANNEL_REQUEST_MISMATCH');
    }
    const assets = request.assets.map((asset) => asset.kind === 'video'
      ? {video: {url: asset.url, metadata: {thumbnailOffset: request.thumbnailOffsetMs}}}
      : {image: {url: asset.url}});

    let response: Response;
    try {
      response = await this.#graphql(CREATE_POST_MUTATION, {
        input: {
          text: postText(request),
          channelId: this.options.channelId,
          schedulingType: 'automatic',
          mode: 'addToQueue',
          needsApproval: false,
          aiAssisted: false,
          assets
        }
      });
    } catch {
      return receipt(request, this.#now, {
        status: 'ambiguous', message: 'BUFFER_RESPONSE_AMBIGUOUS'
      });
    }

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return receipt(request, this.#now, {
          status: 'rejected', message: `BUFFER_HTTP_${response.status}`
        });
      }
      return receipt(request, this.#now, {
        status: 'ambiguous', message: `BUFFER_HTTP_${response.status}_AMBIGUOUS`
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return receipt(request, this.#now, {
        status: 'ambiguous', message: 'BUFFER_RESPONSE_AMBIGUOUS'
      });
    }
    const body = payload as {
      data?: {createPost?: {post?: {id?: string}; message?: string}};
      errors?: Array<{message?: string}>;
    };
    const postId = body.data?.createPost?.post?.id;
    if (postId) {
      return receipt(request, this.#now, {
        status: 'confirmed', message: 'BUFFER_POST_CREATED', providerPostId: postId
      });
    }
    const rejection = body.data?.createPost?.message ?? body.errors?.[0]?.message;
    if (rejection) {
      return receipt(request, this.#now, {status: 'rejected', message: rejection});
    }
    return receipt(request, this.#now, {
      status: 'ambiguous', message: 'BUFFER_RESPONSE_AMBIGUOUS'
    });
  }

  public async validateConnection(): Promise<BufferChannel> {
    let response: Response;
    try {
      response = await this.#graphql(VALIDATE_CHANNEL_QUERY, {
        organizationId: this.options.organizationId
      });
    } catch {
      throw new Error('BUFFER_VALIDATION_UNAVAILABLE');
    }
    if (!response.ok) {
      throw new Error(`BUFFER_VALIDATION_HTTP_${response.status}`);
    }
    const payload = await response.json() as {data?: {channels?: BufferChannel[]}};
    const channel = payload.data?.channels?.find((item) => item.id === this.options.channelId);
    if (!channel) {
      throw new Error('BUFFER_CHANNEL_NOT_FOUND');
    }
    if (channel.service !== this.options.expectedService) {
      throw new Error('BUFFER_CHANNEL_SERVICE_MISMATCH');
    }
    if (channel.isQueuePaused) {
      throw new Error('BUFFER_CHANNEL_QUEUE_PAUSED');
    }
    return channel;
  }
}
