import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { productService } from "../../services/productService";
import { Product } from "../../types/entities";
import {
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  Tag,
  Trash2,
  Wrench,
  Layers,
} from "lucide-react";
import { logError } from "../../lib/errorHandler";
import { useToast } from "../../hooks/useToast";
import { ConfirmDialog } from "../../components/ConfirmDialog";


export const ProductDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true);
      const [productData, ingredientsData] = await Promise.all([
        productService.getById(productId),
        productService.getIngredients(productId),
      ]);
      setProduct(productData);
      setIngredients(ingredientsData || []);
    } catch (err) {
      logError("Error fetching product details", err);
      setError("Error al cargar los datos del producto.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!id) return;
    try {
      await productService.delete(id);
      addToast("Producto eliminado correctamente.", "success");
      navigate("/products");
    } catch (error) {
      logError("Error deleting product", error);
      addToast("Error al eliminar el producto.", "error");
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 p-8 text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange mr-3"></div>
        Cargando detalles...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">{error || "Producto no encontrado"}</p>
        <button
          onClick={() => navigate("/products")}
          className="mt-4 text-brand-orange hover:underline"
        >
          Volver a productos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Eliminar producto"
        description="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteProduct}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/products")}
            className="p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">{product.name}</h1>
            <span className="px-2.5 py-0.5 mt-1 inline-flex text-xs font-semibold rounded-full bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
              {product.category}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/products/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-border rounded-xl bg-card text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Link>
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-error/20 rounded-xl bg-error/5 text-sm font-medium text-error hover:bg-error/10 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">
              Información General
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-secondary">Categoría</p>
                  <p className="text-sm font-medium text-text">{product.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-secondary">Precio Base</p>
                  <p className="text-sm font-medium text-text">${product.base_price.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Layers className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-secondary">Composición</p>
                  <p className="text-sm font-medium text-text">
                    {ingredients.filter((i: any) => i.type !== 'equipment').length} insumos
                    {ingredients.filter((i: any) => i.type === 'equipment').length > 0 && `, ${ingredients.filter((i: any) => i.type === 'equipment').length} equipo(s)`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Composición / Insumos */}
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-brand-orange" />
                <h2 className="text-lg font-bold text-text">Composición / Insumos</h2>
              </div>
            </div>

            {ingredients.filter((i: any) => i.type !== 'equipment').length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-text-secondary mx-auto mb-4 opacity-20" />
                <p className="text-text-secondary">Este producto no tiene insumos configurados.</p>
                <Link to={`/products/${id}/edit`} className="text-brand-orange hover:underline mt-2 inline-block text-sm">
                  Configurar composición
                </Link>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Insumo</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Costo Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ingredients.filter((i: any) => i.type !== 'equipment').map((ing: any) => (
                        <tr key={ing.inventory_id} className="hover:bg-surface-alt/50 transition-colors">
                          <td className="px-6 py-4">
                            <Link to={`/inventory/${ing.inventory_id}`} className="text-sm font-medium text-text hover:text-brand-orange transition-colors">
                              {ing.ingredient_name || "Insumo desconocido"}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-text font-bold">
                              {ing.quantity_required} {ing.unit || ""}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-medium text-text">
                              {ing.unit_cost ? `$${(ing.quantity_required * ing.unit_cost).toFixed(2)}` : "—"}
                            </span>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-6 py-4 border-t border-border flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Costo Total por Unidad</span>
                  <span className="text-lg font-bold text-text">
                    ${ingredients.filter((i: any) => i.type !== 'equipment').reduce((sum: number, ing: any) => sum + (ing.quantity_required * (ing.unit_cost || 0)), 0).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Maquinaria / Equipo Necesario */}
          {ingredients.filter((i: any) => i.type === 'equipment').length > 0 && (
            <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-500" />
                  <h2 className="text-lg font-bold text-text">Equipo Necesario</h2>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  Sin costo - Reutilizable
                </span>
              </div>
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface-alt">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Equipo</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ingredients.filter((i: any) => i.type === 'equipment').map((ing: any) => (
                      <tr key={ing.inventory_id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/inventory/${ing.inventory_id}`} className="text-sm font-medium text-text hover:text-brand-orange transition-colors">
                            {ing.ingredient_name || "Equipo desconocido"}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-text font-bold">
                            {ing.quantity_required} {ing.unit || ""}
                          </span>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
