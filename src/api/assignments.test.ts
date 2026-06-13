import { describe, expect, it, vi } from 'vitest';
import { AssignmentsApi } from './assignments.js';
import type { HttpClient } from '../core/http-client.js';

const BASE_URL = 'https://example.test';

function makeActivities(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1, title: `HW ${i + 1}` }));
}

/**
 * Mock client whose homework-activities endpoint is paginated. `serverPageSize`
 * is the page size the server actually enforces, regardless of the requested
 * `page_size` — this mirrors tenants (e.g. FJU) that cap pages at 10.
 */
function paginatedClient(total: number, serverPageSize: number) {
  const items = makeActivities(total);
  const urls: string[] = [];
  const getJson = vi.fn(async (url: string) => {
    urls.push(url);
    const page = Number(new URL(url).searchParams.get('page') ?? '1');
    const pages = Math.max(1, Math.ceil(total / serverPageSize));
    const start = (page - 1) * serverPageSize;
    return {
      page,
      page_size: serverPageSize,
      pages,
      total,
      homework_activities: items.slice(start, start + serverPageSize),
    };
  });
  return { client: { getJson } as unknown as HttpClient, urls, getJson };
}

describe('AssignmentsApi.getHomeworkActivities', () => {
  it('aggregates across all pages when the server caps page_size', async () => {
    const { client, urls, getJson } = paginatedClient(25, 10);
    const api = new AssignmentsApi(client, BASE_URL);

    const result = await api.getHomeworkActivities(384009);

    expect(result).toHaveLength(25);
    expect(result.map((h) => h.id)).toEqual([...Array(25)].map((_, i) => i + 1));
    expect(getJson).toHaveBeenCalledTimes(3);
    expect(urls[0]).toContain('/api/courses/384009/homework-activities?page=1&page_size=100');
    expect(urls.map((u) => new URL(u).searchParams.get('page'))).toEqual(['1', '2', '3']);
  });

  it('returns everything in a single request when the server honors page_size', async () => {
    const { client, getJson } = paginatedClient(25, 100);
    const api = new AssignmentsApi(client, BASE_URL);

    const result = await api.getHomeworkActivities(1);

    expect(result).toHaveLength(25);
    expect(getJson).toHaveBeenCalledTimes(1);
  });

  it('fetches only the requested page when opts.page is given', async () => {
    const { client, urls, getJson } = paginatedClient(25, 10);
    const api = new AssignmentsApi(client, BASE_URL);

    const result = await api.getHomeworkActivities(1, { page: 2 });

    expect(result.map((h) => h.id)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(getJson).toHaveBeenCalledTimes(1);
    expect(urls[0]).toContain('page=2&page_size=100');
  });

  it('forwards a custom pageSize', async () => {
    const { client, urls } = paginatedClient(5, 50);
    const api = new AssignmentsApi(client, BASE_URL);

    await api.getHomeworkActivities(1, { pageSize: 50 });

    expect(urls[0]).toContain('page=1&page_size=50');
  });

  it('degrades gracefully when the response has no pagination metadata', async () => {
    const getJson = vi.fn(async () => ({ homework_activities: makeActivities(4) }));
    const api = new AssignmentsApi({ getJson } as unknown as HttpClient, BASE_URL);

    const result = await api.getHomeworkActivities(1);

    expect(result).toHaveLength(4);
    expect(getJson).toHaveBeenCalledTimes(1);
  });
});
