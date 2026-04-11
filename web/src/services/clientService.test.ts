import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clientService } from './clientService';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
  },
}));

describe('clientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll calls api.get', async () => {
    (api.get as any).mockResolvedValue([]);
    await clientService.getAll();
    expect(api.get).toHaveBeenCalledWith('/clients');
  });

  it('getPage calls api.get with pagination params and returns envelope', async () => {
    const response = { data: [{ id: '1' }], total: 1, page: 2, limit: 10, total_pages: 1 };
    (api.get as any).mockResolvedValue(response);

    await expect(clientService.getPage({ page: 2, limit: 10, sort: 'name', order: 'asc' })).resolves.toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/clients', { page: '2', limit: '10', sort: 'name', order: 'asc' });
  });

  it('getById calls api.get', async () => {
    (api.get as any).mockResolvedValue({ id: '1' });
    await clientService.getById('1');
    expect(api.get).toHaveBeenCalledWith('/clients/1');
  });

  it('create calls api.post', async () => {
    (api.post as any).mockResolvedValue({ id: '1' });
    await clientService.create({ name: 'Test' } as any);
    expect(api.post).toHaveBeenCalledWith('/clients', { name: 'Test' });
  });

  it('update calls api.put', async () => {
    (api.put as any).mockResolvedValue({ id: '1' });
    await clientService.update('1', { name: 'Updated' } as any);
    expect(api.put).toHaveBeenCalledWith('/clients/1', { name: 'Updated' });
  });

  it('delete calls api.delete', async () => {
    (api.delete as any).mockResolvedValue({});
    await clientService.delete('1');
    expect(api.delete).toHaveBeenCalledWith('/clients/1');
  });

  it('uploadPhoto calls api.postFormData with FormData', async () => {
    const mockResponse = { url: 'https://example.com/img.jpg', thumbnail_url: 'https://example.com/thumb.jpg' };
    (api.postFormData as any).mockResolvedValue(mockResponse);

    const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await clientService.uploadPhoto(file);

    expect(api.postFormData).toHaveBeenCalledWith('/uploads/image', expect.any(FormData));
    expect(result).toEqual(mockResponse);
  });
});
