import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../../services/inventoryService';
import { Database } from '../../types/supabase';
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { logError } from '../../lib/errorHandler';
import Empty from '../../components/Empty';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];

export const InventoryList: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await inventoryService.getAll();
      setItems(data);
    } catch (error) {
      logError('Error fetching inventory', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = items.filter(item => item.current_stock <= item.minimum_stock);

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
      await inventoryService.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (error) {
      logError('Error deleting item', error);
    }
  };

  const filteredItems = items.filter(item => 
    item.ingredient_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar ingrediente"
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario</h1>
        <Link
          to="/inventory/new"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 shadow-sm transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Ingrediente
        </Link>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                Atención: Stock bajo detectado
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                <p>
                  Hay {lowStockItems.length} ítem(s) por debajo del nivel mínimo. Revisa la lista para reabastecer.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-brand-orange focus:border-brand-orange sm:text-sm transition duration-150 ease-in-out"
          placeholder="Buscar ingrediente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Cargando inventario...</div>
        ) : filteredItems.length === 0 ? (
          <Empty 
            title="No se encontraron ingredientes" 
            description={searchTerm ? "Intenta ajustar los términos de búsqueda." : "Comienza agregando tu primer ingrediente al inventario."}
            action={
              !searchTerm ? (
                <Link
                  to="/inventory/new"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600 shadow-sm"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Ingrediente
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ítem
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stock Mínimo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Costo Unitario
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.map((item) => {
                  const isLowStock = item.current_stock <= item.minimum_stock;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.ingredient_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Unidad: {item.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          item.type === 'equipment' 
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" 
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        )}>
                          {item.type === 'equipment' ? 'Equipo' : 'Ingrediente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={clsx(
                            "text-sm font-medium",
                            isLowStock ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-900 dark:text-white"
                          )}>
                            {item.current_stock}
                          </span>
                          {isLowStock && (
                            <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.minimum_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ${item.unit_cost?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link to={`/inventory/${item.id}/edit`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                            <Edit className="h-5 w-5" />
                          </Link>
                          <button 
                            onClick={() => requestDelete(item.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
