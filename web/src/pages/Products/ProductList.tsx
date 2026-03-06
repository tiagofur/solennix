import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productService } from '../../services/productService';
import { Product } from '../../types/entities';
import { Plus, Search, Edit, Trash2, Package, Download, UtensilsCrossed, X } from 'lucide-react';
import { exportToCsv } from '../../lib/exportCsv';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { logError } from '../../lib/errorHandler';
import Empty from '../../components/Empty';
import { useToast } from '../../hooks/useToast';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/Pagination';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { SkeletonTable } from '../../components/Skeleton';

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data || []);
    } catch (error) {
      logError('Error fetching products', error);
      addToast('Error al cargar los productos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);

    try {
      await productService.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      addToast('Producto eliminado correctamente.', 'success');
    } catch (error) {
      logError('Error deleting product', error);
      addToast('Error al eliminar el producto.', 'error');
    }
  };

  const categories = useMemo(() => {
    const cats = new Set((products || []).map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = (products || []).filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const {
    currentData: paginatedProducts,
    currentPage,
    totalPages,
    totalItems,
    handlePageChange,
    handleSort,
    sortKey,
    sortOrder
  } = usePagination({
    data: filteredProducts,
    itemsPerPage: 10,
    initialSortKey: 'name',
    initialSortOrder: 'asc'
  });

  const renderSortIcon = (key: keyof Product) => {
    if (sortKey !== key) return null;
    return sortOrder === 'asc' ? <ArrowUp className="inline h-3 w-3 ml-1" aria-hidden="true" /> : <ArrowDown className="inline h-3 w-3 ml-1" aria-hidden="true" />;
  };

  const getSortAriaSort = (key: keyof Product): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return sortOrder === 'asc' ? "ascending" : "descending";
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar producto"
        description="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-black tracking-tight text-text">
          Productos
        </h1>
        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <button
              type="button"
              onClick={() => exportToCsv(
                'productos',
                ['Nombre', 'Categoría', 'Precio Base', 'Activo'],
                products.map(p => [p.name, p.category, p.base_price.toFixed(2), p.is_active ? 'Sí' : 'No']),
              )}
              className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
              aria-label="Exportar productos a CSV"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              CSV
            </button>
          )}
          <Link
            to="/products/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white premium-gradient shadow-xs transition-opacity hover:opacity-90"
          >
            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
            Nuevo Producto
          </Link>
        </div>
      </div>

      <div className="relative max-w-md">
        <label htmlFor="product-search" className="sr-only">Buscar productos</label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>
        <input
          id="product-search"
          type="search"
          className="block w-full pl-10 pr-8 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-text-secondary focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary sm:text-sm transition duration-150 ease-in-out"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card text-text-secondary border-border hover:border-primary/50 hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
        {loading ? (
          <SkeletonTable
            rows={6}
            columns={[
              { width: "w-48", avatar: true },
              { width: "w-24" },
              { width: "w-24", badge: true },
              { width: "w-20" },
            ]}
          />
        ) : filteredProducts.length === 0 ? (
          <Empty
            icon={UtensilsCrossed}
            title="No hay productos"
            description={searchTerm || selectedCategory ? "No se encontraron productos con ese criterio." : "Comienza agregando tu primer producto."}
            action={!searchTerm && !selectedCategory ? (
              <Link
                to="/products/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white premium-gradient hover:opacity-90"
              >
                <Plus className="h-5 w-5 mr-2" />
                Agregar Producto
              </Link>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-alt">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort('name')}
                    aria-sort={getSortAriaSort('name')}
                  >
                    Nombre {renderSortIcon('name')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort('base_price')}
                    aria-sort={getSortAriaSort('base_price')}
                  >
                    Precio {renderSortIcon('base_price')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort('category')}
                    aria-sort={getSortAriaSort('category')}
                  >
                    Categoría {renderSortIcon('category')}
                  </th>
                  <th scope="col" className="relative px-6 py-3 text-text-secondary">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    className="hover:bg-surface-alt/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10">
                          {product.image_url ? (
                            <img className="h-10 w-10 rounded-lg object-cover" src={product.image_url} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text">{product.name}</span>
                            {!product.is_active && (
                              <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-error/10 text-error border border-error/20">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-text-secondary">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-text">${product.base_price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                        {product.category}
                      </span>
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/products/${product.id}/edit`}
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface-alt rounded-lg transition-colors inline-block"
                          aria-label={`Editar ${product.name}`}
                        >
                          <Edit className="h-5 w-5" aria-hidden="true" />
                        </Link>
                        <button
                          onClick={() => requestDelete(product.id)}
                          className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors inline-block"
                          aria-label={`Eliminar ${product.name}`}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredProducts.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={10}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};
