import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { inventoryService } from "../../services/inventoryService";
import { InventoryItem } from "../../types/entities";
import {
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  PackageCheck,
  Trash2,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { logError } from "../../lib/errorHandler";
import { useToast } from "../../hooks/useToast";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import clsx from "clsx";

export const InventoryDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (id) {
      loadItem(id);
    }
  }, [id]);

  const loadItem = async (itemId: string) => {
    try {
      setLoading(true);
      const itemData = await inventoryService.getById(itemId);
      setItem(itemData);
    } catch (err) {
      logError("Error fetching inventory item details", err);
      setError("Error al cargar los datos del ítem.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!id) return;
    try {
      await inventoryService.delete(id);
      addToast("Ítem eliminado correctamente.", "success");
      navigate("/inventory");
    } catch (error) {
      logError("Error deleting inventory item", error);
      addToast("Error al eliminar el ítem de inventario.", "error");
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

  if (error || !item) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">{error || "Ítem de inventario no encontrado"}</p>
        <button
          onClick={() => navigate("/inventory")}
          className="mt-4 text-brand-orange hover:underline"
        >
          Volver a inventario
        </button>
      </div>
    );
  }

  const isLowStock = item.current_stock <= item.minimum_stock;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Eliminar ítem"
        description="¿Estás seguro de que deseas eliminar este ítem del inventario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteItem}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/inventory")}
            className="p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">{item.ingredient_name}</h1>
            <span className={clsx(
              "px-2.5 py-0.5 mt-1 inline-flex text-xs font-semibold rounded-full border",
              item.type === "equipment" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-brand-orange/10 text-brand-orange border-brand-orange/20"
            )}>
              {item.type === "equipment" ? "Activo / Equipo" : "Insumo Consumible"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/inventory/${id}/edit`}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm overflow-hidden relative">
            {isLowStock && (
              <div className="absolute top-0 right-0">
                <div className="bg-error text-white text-[10px] font-bold uppercase px-3 py-1 rotate-45 transform translate-x-3 translate-y-2">
                  Stock Bajo
                </div>
              </div>
            )}
            
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">
              Estado de Existencias
            </h2>
            
            <div className="flex items-center justify-between p-4 bg-surface-alt rounded-2xl mb-4">
              <div className="text-center flex-1">
                <p className="text-3xl font-bold text-text">{item.current_stock}</p>
                <p className="text-xs text-text-secondary uppercase">Actual ({item.unit})</p>
              </div>
              <div className="h-10 w-px bg-border"></div>
              <div className="text-center flex-1">
                <p className="text-3xl font-bold text-text-secondary">{item.minimum_stock}</p>
                <p className="text-xs text-text-secondary uppercase">Mínimo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-secondary">Costo Unitario</p>
                  <p className="text-sm font-medium text-text">${item.unit_cost?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PackageCheck className="h-5 w-5 text-brand-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-text-secondary">Valor del Stock</p>
                  <p className="text-sm font-medium text-text">${(item.current_stock * (item.unit_cost || 0)).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-brand-orange" />
              <h2 className="text-lg font-bold text-text">Resumen Operativo</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-brand-orange/5 border border-brand-orange/10 rounded-2xl">
                <h3 className="text-xs font-semibold text-brand-orange uppercase mb-1">Impacto en Producción</h3>
                <p className="text-sm text-text-secondary">
                  Este ítem se utiliza en los productos que requieren {item.ingredient_name}.
                  Asegúrate de mantener el stock mínimo para evitar retrasos.
                </p>
              </div>
              <div className="p-4 bg-surface-alt border border-border rounded-2xl">
                <h3 className="text-xs font-semibold text-text-secondary uppercase mb-1">Última Actualización</h3>
                <p className="text-sm text-text">Hoy a las {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
            
            <div className="mt-8">
               <h3 className="text-sm font-semibold text-text uppercase mb-4 flex items-center gap-2">
                 <TrendingDown className="h-4 w-4 text-error" />
                 Alertas de Consumo
               </h3>
               {isLowStock ? (
                 <div className="flex items-start gap-3 p-4 bg-error/5 border border-error/20 rounded-2xl">
                   <AlertTriangle className="h-10 w-10 text-error shrink-0" />
                   <div>
                     <p className="font-bold text-error">Atención: El stock está por debajo del límite sugerido.</p>
                     <p className="text-sm text-error/80 mt-1">
                       Se recomienda realizar una compra inmediata para garantizar el abastecimiento de los próximos eventos.
                     </p>
                   </div>
                 </div>
               ) : (
                 <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-2xl text-secondary text-sm">
                   El stock está en niveles óptimos. No se requiere acción inmediata.
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
