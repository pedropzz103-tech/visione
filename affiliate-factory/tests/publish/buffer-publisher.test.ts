import {describe, expect, it, vi} from 'vitest';
import {BufferPublisher} from '../../src/publish/buffer-publisher.js';
import {makePublishRequest} from '../helpers/factories.js';

type BufferCall = {url: string; init: RequestInit};

function successFetch(calls: BufferCall[]): typeof fetch {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({url: String(url), init: init ?? {}});
    return Response.json({
      data: {createPost: {post: {id: 'buffer-post-1', status: 'buffer', assets: []}}}
    });
  }) as typeof fetch;
}

describe('BufferPublisher', () => {
  it('uses the official createPost mutation for automatic TikTok video', async () => {
    const calls: BufferCall[] = [];
    const request = makePublishRequest('tiktok');
    const publisher = new BufferPublisher({
      apiKey: 'secret', channelId: 'tiktok-1', organizationId: 'org-1',
      channel: 'tiktok', expectedService: 'tiktok', fetchFn: successFetch(calls)
    });

    const receipt = await publisher.publish(request);

    expect(calls[0]?.url).toBe('https://api.buffer.com');
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.variables.input).toMatchObject({
      channelId: 'tiktok-1', schedulingType: 'automatic', mode: 'addToQueue',
      needsApproval: false, aiAssisted: false
    });
    expect(body.variables.input.text).toContain(request.affiliateUrl);
    expect(body.variables.input.assets[0].video).toEqual({
      url: request.assets[0]?.url,
      metadata: {thumbnailOffset: 2000}
    });
    expect(receipt).toMatchObject({
      status: 'confirmed', channel: 'tiktok', providerPostId: 'buffer-post-1'
    });
  });

  it.each([
    ['x', 'twitter'],
    ['threads', 'threads']
  ] as const)('publishes %s with the supplied images and affiliate link', async (channel, service) => {
    const calls: BufferCall[] = [];
    const request = {
      ...makePublishRequest(channel),
      assets: [
        {kind: 'image' as const, url: 'https://media.example.test/final/publication/p/1.jpg'},
        {kind: 'image' as const, url: 'https://media.example.test/final/publication/p/2.jpg'}
      ]
    };
    const publisher = new BufferPublisher({
      apiKey: 'secret', channelId: `${channel}-1`, organizationId: 'org-1',
      channel, expectedService: service, fetchFn: successFetch(calls)
    });

    const receipt = await publisher.publish(request);
    const input = JSON.parse(String(calls[0]?.init.body)).variables.input;

    expect(input.text).toContain(request.affiliateUrl);
    expect(input.assets).toEqual(request.assets.map((asset) => ({image: {url: asset.url}})));
    expect(receipt.channel).toBe(channel);
  });

  it('keeps an X post within 280 characters without losing disclosure or link', async () => {
    const calls: BufferCall[] = [];
    const request = {...makePublishRequest('x'), caption: `${'descrição factual '.repeat(30)}#publicidade`};
    const publisher = new BufferPublisher({
      apiKey: 'secret', channelId: 'x-1', organizationId: 'org-1',
      channel: 'x', expectedService: 'twitter', fetchFn: successFetch(calls)
    });

    await publisher.publish(request);
    const text = JSON.parse(String(calls[0]?.init.body)).variables.input.text as string;

    expect(text.length).toBeLessThanOrEqual(280);
    expect(text).toContain('#publicidade');
    expect(text).toContain(request.affiliateUrl);
  });

  it('validates that the configured Buffer channel is connected and unpaused', async () => {
    const fetchFn = vi.fn(async () => Response.json({data: {channels: [
      {id: 'x-1', name: 'Affiliate X', service: 'twitter', isQueuePaused: false}
    ]}})) as typeof fetch;
    const publisher = new BufferPublisher({
      apiKey: 'secret', channelId: 'x-1', organizationId: 'org-1',
      channel: 'x', expectedService: 'twitter', fetchFn
    });

    await expect(publisher.validateConnection()).resolves.toMatchObject({id: 'x-1'});
  });

  it('returns rejected for a typed MutationError', async () => {
    const fetchFn = vi.fn(async () => Response.json({
      data: {createPost: {message: 'invalid media'}}
    })) as typeof fetch;
    const publisher = new BufferPublisher({
      apiKey: 'secret', channelId: 'tiktok-1', organizationId: 'org-1',
      channel: 'tiktok', expectedService: 'tiktok', fetchFn
    });

    await expect(publisher.publish(makePublishRequest())).resolves.toMatchObject({
      status: 'rejected', message: 'invalid media'
    });
  });

  it('returns ambiguous after a transmitted request loses its response', async () => {
    const fetchFn = vi.fn(async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    const publisher = new BufferPublisher({
      apiKey: 'secret', channelId: 'tiktok-1', organizationId: 'org-1',
      channel: 'tiktok', expectedService: 'tiktok', fetchFn
    });

    await expect(publisher.publish(makePublishRequest())).resolves.toMatchObject({
      status: 'ambiguous', message: 'BUFFER_RESPONSE_AMBIGUOUS'
    });
  });
});
