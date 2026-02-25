import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from './productService';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll calls api.get', async () => {
    (api.get as any).mockResolvedValue([]);
    await productService.getAll();
    expect(api.get).toHaveBeenCalledWith('/products');
  });

  it('getById calls api.get', async () => {
    (api.get as any).mockResolvedValue({ id: '1' });
    await productService.getById('1');
    expect(api.get).toHaveBeenCalledWith('/products/1');
  });

  it('create calls api.post', async () => {
    (api.post as any).mockResolvedValue({ id: '1' });
    await productService.create({ name: 'Test' } as any);
    expect(api.post).toHaveBeenCalledWith('/products', { name: 'Test' });
  });

  it('update calls api.put', async () => {
    (api.put as any).mockResolvedValue({ id: '1' });
    await productService.update('1', { name: 'Updated' } as any);
    expect(api.put).toHaveBeenCalledWith('/products/1', { name: 'Updated' });
  });

  it('delete calls api.delete', async () => {
    (api.delete as any).mockResolvedValue({});
    await productService.delete('1');
    expect(api.delete).toHaveBeenCalledWith('/products/1');
  });

  it('addIngredients maps payload and calls api.put', async () => {
    (api.put as any).mockResolvedValue({});
    await productService.addIngredients('prod-1', [
      { inventoryId: 'inv-1', quantityRequired: 2 },
    ]);
    expect(api.put).toHaveBeenCalledWith('/products/prod-1/ingredients', {
      ingredients: [
        { product_id: 'prod-1', inventory_id: 'inv-1', quantity_required: 2 },
      ],
    });
  });

  it('getIngredients calls api.get', async () => {
    (api.get as any).mockResolvedValue([]);
    await productService.getIngredients('1');
    expect(api.get).toHaveBeenCalledWith('/products/1/ingredients');
  });

  it('getIngredientsForProducts returns empty for none', async () => {
    const result = await productService.getIngredientsForProducts([]);
    expect(result).toEqual([]);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('getIngredientsForProducts calls batch endpoint', async () => {
    (api.post as any).mockResolvedValueOnce([{ inventory_id: 'i1' }, { inventory_id: 'i2' }]);

    const result = await productService.getIngredientsForProducts(['p1', 'p2']);

    expect(api.post).toHaveBeenCalledWith('/products/ingredients/batch', { product_ids: ['p1', 'p2'] });
    expect(result).toEqual([{ inventory_id: 'i1' }, { inventory_id: 'i2' }]);
  });

  it('updateIngredients maps payload and calls api.put', async () => {
    (api.put as any).mockResolvedValue({});
    await productService.updateIngredients('prod-2', [
      { inventoryId: 'inv-9', quantityRequired: 1.5 },
    ]);
    expect(api.put).toHaveBeenCalledWith('/products/prod-2/ingredients', {
      ingredients: [
        { product_id: 'prod-2', inventory_id: 'inv-9', quantity_required: 1.5 },
      ],
    });
  });
});
