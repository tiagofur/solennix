import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { productService } from "../../services/productService";
import { inventoryService } from "../../services/inventoryService";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Save, Plus, Trash2, ChefHat } from "lucide-react";
import { Database } from "../../types/supabase";

type InventoryItem = Database['public']['Tables']['inventory']['Row'];

const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  category: z.string().min(2, "La categoría es requerida"),
  base_price: z.coerce.number().min(0, "El precio no puede ser negativo"),
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<{inventory_id: string, quantity_required: number, unit_cost: number, unit: string}[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: "",
      category: "",
      base_price: 0,
    },
  });

  useEffect(() => {
    loadDependencies();
    if (id) {
      loadProduct(id);
    }
  }, [id]);

  const loadDependencies = async () => {
      try {
          const items = await inventoryService.getAll();
          setInventoryItems(items);
      } catch (err) {
          console.error("Error loading inventory:", err);
      }
  };

  const loadProduct = async (productId: string) => {
    try {
      setIsLoading(true);
      const product = await productService.getById(productId);
      if (!product) {
        throw new Error('Producto no encontrado');
      }
      reset({
        name: product.name || "",
        category: product.category || "",
        base_price: product.base_price || 0,
      });

      // Load recipe ingredients
      const ingredients = await productService.getIngredients(productId);
      if (ingredients) {
          setRecipeIngredients(ingredients.map((i: any) => ({
              inventory_id: i.inventory_id,
              quantity_required: i.quantity_required,
              unit_cost: i.inventory?.unit_cost || 0,
              unit: i.inventory?.unit || ''
          })));
      }

    } catch (err) {
      console.error("Error loading product:", err);
      setError("Error al cargar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIngredient = () => {
      if (inventoryItems.length > 0) {
          const item = inventoryItems[0];
          setRecipeIngredients([...recipeIngredients, { 
              inventory_id: item.id, 
              quantity_required: 1,
              unit_cost: item.unit_cost || 0,
              unit: item.unit
          }]);
      }
  };

  const handleRemoveIngredient = (index: number) => {
      const newIngredients = [...recipeIngredients];
      newIngredients.splice(index, 1);
      setRecipeIngredients(newIngredients);
  };

  const handleIngredientChange = (index: number, field: 'inventory_id' | 'quantity_required', value: any) => {
      const newIngredients = [...recipeIngredients];
      newIngredients[index] = { ...newIngredients[index], [field]: value };
      
      if (field === 'inventory_id') {
          const item = inventoryItems.find(i => i.id === value);
          if (item) {
              newIngredients[index].unit_cost = item.unit_cost || 0;
              newIngredients[index].unit = item.unit;
          }
      }
      
      setRecipeIngredients(newIngredients);
  };

  const calculateTotalCost = () => {
      return recipeIngredients.reduce((sum, item) => sum + (item.quantity_required * item.unit_cost), 0);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      let productId = id;

      if (id) {
        await productService.update(id, data);
      } else {
        const newProduct = await productService.create({
          ...data,
          user_id: user.id,
        });
        if (!newProduct) {
          throw new Error('Error al crear el producto');
        }
        productId = newProduct.id;
      }

      if (productId) {
          const ingredientsToSave = recipeIngredients.map(i => ({
              inventoryId: i.inventory_id,
              quantityRequired: i.quantity_required
          }));
          await productService.updateIngredients(productId, ingredientsToSave);
      }

      navigate("/products");
    } catch (err: any) {
      console.error("Error saving product:", err);
      setError(err.message || "Error al guardar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/products")}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? "Editar Producto" : "Nuevo Producto"}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario Principal */}
        <div className="lg:col-span-2 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                    <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-4">
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                >
                    Nombre del Producto *
                </label>
                <div className="mt-1">
                    <input
                    type="text"
                    {...register("name")}
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="Ej. Churros Clásicos"
                    />
                    {errors.name && (
                    <p className="mt-2 text-sm text-red-600">
                        {errors.name.message}
                    </p>
                    )}
                </div>
                </div>

                <div className="sm:col-span-3">
                <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700"
                >
                    Categoría *
                </label>
                <div className="mt-1">
                    <input
                    type="text"
                    {...register("category")}
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    placeholder="Ej. Postres"
                    />
                    {errors.category && (
                    <p className="mt-2 text-sm text-red-600">
                        {errors.category.message}
                    </p>
                    )}
                </div>
                </div>

                <div className="sm:col-span-3">
                <label
                    htmlFor="base_price"
                    className="block text-sm font-medium text-gray-700"
                >
                    Precio Base ($) *
                </label>
                <div className="mt-1">
                    <input
                    type="number"
                    step="0.01"
                    {...register("base_price")}
                    className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    />
                    {errors.base_price && (
                    <p className="mt-2 text-sm text-red-600">
                        {errors.base_price.message}
                    </p>
                    )}
                </div>
                </div>
            </div>
            </form>
        </div>

        {/* Receta / Ingredientes */}
        <div className="lg:col-span-1 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6 flex flex-col">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <ChefHat className="h-5 w-5 mr-2 text-brand-orange" />
                Receta (por unidad/persona)
            </h3>
            <p className="text-xs text-gray-500 mb-4">Define qué ingredientes y qué cantidad se necesitan para 1 unidad de este producto.</p>

            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {recipeIngredients.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md relative group">
                        <button 
                            onClick={() => handleRemoveIngredient(index)}
                            className="absolute top-1 right-1 text-gray-400 hover:text-red-500"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="mb-2 pr-6">
                            <select
                                value={item.inventory_id}
                                onChange={(e) => handleIngredientChange(index, 'inventory_id', e.target.value)}
                                className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                            >
                                <option value="">Seleccionar ingrediente</option>
                                {inventoryItems.map(i => (
                                    <option key={i.id} value={i.id}>{i.ingredient_name} ({i.unit})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500">Cantidad</label>
                                <input 
                                    type="number" 
                                    step="0.001"
                                    value={item.quantity_required}
                                    onChange={(e) => handleIngredientChange(index, 'quantity_required', Number(e.target.value))}
                                    className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange"
                                />
                            </div>
                            <div className="w-1/2 text-right">
                                <span className="text-xs text-gray-500 block">Costo Est.</span>
                                <span className="text-sm font-medium text-gray-700">
                                    ${(item.quantity_required * item.unit_cost).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                
                <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Plus className="h-4 w-4 mr-2" /> Agregar Ingrediente
                </button>
            </div>

            <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Costo Total por Unidad</span>
                    <span className="text-lg font-bold text-gray-900">
                        ${calculateTotalCost().toFixed(2)}
                    </span>
                </div>
            </div>

            <div className="mt-6">
                <button
                    type="submit"
                    form="product-form"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50"
                >
                    <Save className="h-5 w-5 mr-2" />
                    {isLoading ? "Guardando..." : "Guardar Producto"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
