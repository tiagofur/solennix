import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { productService } from "../../services/productService";
import { inventoryService } from "../../services/inventoryService";
import { useAuth } from "../../contexts/AuthContext";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Layers,
  Wrench,
  Fuel,
  Camera,
  X,
} from "lucide-react";
import { InventoryItem } from "../../types/entities";
import { logError } from "../../lib/errorHandler";
import { usePlanLimits } from "../../hooks/usePlanLimits";
import { UpgradeBanner } from "../../components/UpgradeBanner";

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
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    canCreateCatalogItem,
    catalogCount,
    catalogLimit,
    loading: limitsLoading,
  } = usePlanLimits();

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<
    {
      inventory_id: string;
      quantity_required: number;
      capacity: number | null;
      bring_to_event: boolean;
      unit_cost: number;
      unit: string;
      _type: "ingredient" | "equipment" | "supply";
    }[]
  >([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormData>,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDependencies = async () => {
    try {
      const items = await inventoryService.getAll();
      setInventoryItems(items || []);
    } catch (err) {
      logError("Error loading inventory", err);
    }
  };

  const loadProduct = async (productId: string) => {
    try {
      setIsLoading(true);
      const product = await productService.getById(productId);
      if (!product) {
        throw new Error("Producto no encontrado");
      }
      reset({
        name: product.name || "",
        category: product.category || "",
        base_price: product.base_price || 0,
      });
      setIsActive(product.is_active ?? true);
      if (product.image_url) {
        setImageUrl(product.image_url);
        setImagePreview(product.image_url);
      }

      // Load recipe ingredients
      const ingredients = await productService.getIngredients(productId);
      if (ingredients) {
        setRecipeIngredients(
          ingredients.map((i: any) => ({
            inventory_id: i.inventory_id,
            quantity_required: i.quantity_required,
            capacity: i.capacity ?? null,
            bring_to_event: i.bring_to_event ?? false,
            unit_cost: i.unit_cost || 0,
            unit: i.unit || "",
            _type:
              i.type === "equipment"
                ? ("equipment" as const)
                : i.type === "supply"
                  ? ("supply" as const)
                  : ("ingredient" as const),
          })),
        );
      }
    } catch (err) {
      logError("Error loading product", err);
      setError("Error al cargar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen es demasiado grande (máximo 10MB).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      setIsUploadingImage(true);
      const result = await productService.uploadImage(file);
      setImageUrl(result.url);
    } catch (err) {
      logError("Error uploading product image", err);
      setError("Error al subir la imagen.");
      setImagePreview(imageUrl);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddIngredient = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      {
        inventory_id: "",
        quantity_required: 1,
        capacity: null,
        bring_to_event: false,
        unit_cost: 0,
        unit: "",
        _type: "ingredient",
      },
    ]);
  };

  const handleAddEquipment = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      {
        inventory_id: "",
        quantity_required: 1,
        capacity: null,
        bring_to_event: false,
        unit_cost: 0,
        unit: "",
        _type: "equipment",
      },
    ]);
  };

  const handleAddSupply = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      {
        inventory_id: "",
        quantity_required: 1,
        capacity: null,
        bring_to_event: true,
        unit_cost: 0,
        unit: "",
        _type: "supply",
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngredients = [...recipeIngredients];
    newIngredients.splice(index, 1);
    setRecipeIngredients(newIngredients);
  };

  const handleIngredientChange = (
    index: number,
    field: "inventory_id" | "quantity_required" | "capacity" | "bring_to_event",
    value: any,
  ) => {
    const newIngredients = [...recipeIngredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };

    if (field === "inventory_id") {
      const item = inventoryItems.find((i) => i.id === value);
      if (item) {
        newIngredients[index].unit_cost = item.unit_cost || 0;
        newIngredients[index].unit = item.unit;
      }
    }

    setRecipeIngredients(newIngredients);
  };

  const calculateTotalCost = () => {
    return recipeIngredients
      .filter((item) => item._type === "ingredient")
      .reduce((sum, item) => sum + item.quantity_required * item.unit_cost, 0);
  };

  const calculatePerEventCost = () => {
    return recipeIngredients
      .filter((item) => item._type === "supply")
      .reduce((sum, item) => sum + item.quantity_required * item.unit_cost, 0);
  };

  const ingredientInventoryItems = inventoryItems.filter(
    (i) => i.type === "ingredient",
  );
  const equipmentInventoryItems = inventoryItems.filter(
    (i) => i.type === "equipment",
  );
  const supplyInventoryItems = inventoryItems.filter(
    (i) => i.type === "supply",
  );

  const ingredientEntries = recipeIngredients
    .map((item, idx) => ({ item, originalIndex: idx }))
    .filter(({ item }) => item._type === "ingredient");

  const equipmentEntries = recipeIngredients
    .map((item, idx) => ({ item, originalIndex: idx }))
    .filter(({ item }) => item._type === "equipment");

  const supplyEntries = recipeIngredients
    .map((item, idx) => ({ item, originalIndex: idx }))
    .filter(({ item }) => item._type === "supply");

  const onSubmit = async (data: ProductFormData) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      let productId = id;

      if (id) {
        await productService.update(id, {
          ...data,
          image_url: imageUrl || null,
          is_active: isActive,
        });
      } else {
        const newProduct = await productService.create({
          ...data,
          user_id: user.id,
          image_url: imageUrl || null,
          is_active: isActive,
          recipe: null,
        });
        if (!newProduct) {
          throw new Error("Error al crear el producto");
        }
        productId = newProduct.id;
      }

      if (productId) {
        const ingredientsToSave = recipeIngredients.map((i) => ({
          inventoryId: i.inventory_id,
          quantityRequired: i.quantity_required,
          capacity: i._type === "equipment" ? (i.capacity ?? null) : null,
          bringToEvent: i.bring_to_event,
        }));
        await productService.updateIngredients(productId, ingredientsToSave);
      }

      navigate("/products");
    } catch (err: any) {
      logError("Error saving product", err);
      setError(err.message || "Error al guardar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  if (limitsLoading) {
    return (
      <div
        className="flex justify-center items-center h-64"
        role="status"
        aria-live="polite"
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          aria-hidden="true"
        ></div>
        <span className="sr-only">Cargando límites de plan...</span>
      </div>
    );
  }

  if (!id && !canCreateCatalogItem) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-sm font-medium text-text-secondary hover:text-text transition-colors"
          aria-label="Regresar a la página anterior"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Regresar
        </button>
        <div className="flex justify-center mt-12">
          <UpgradeBanner
            type="limit-reached"
            resource="catalog"
            currentUsage={catalogCount}
            limit={catalogLimit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary"
            aria-label="Volver a la lista de productos"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-text">
            {id ? "Editar Producto" : "Nuevo Producto"}
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Formulario Principal */}
        <div className="bg-card shadow-sm border border-border px-4 py-8 rounded-3xl sm:p-10">
          <form
            id="product-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {error && (
              <div
                className="bg-error/10 border-l-4 border-error p-4"
                role="alert"
              >
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-error">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
              <div className="sm:col-span-6 flex justify-center">
                <div className="relative">
                  <div
                    className="h-24 w-24 rounded-2xl bg-surface-alt flex items-center justify-center overflow-hidden border-2 border-border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        fileInputRef.current?.click();
                    }}
                    aria-label="Subir imagen del producto"
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Imagen del producto"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera
                        className="h-8 w-8 text-text-secondary"
                        aria-hidden="true"
                      />
                    )}
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                      </div>
                    )}
                  </div>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-1 -right-1 bg-error text-white rounded-full p-0.5 hover:bg-error/80 transition-colors"
                      aria-label="Eliminar imagen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    aria-label="Seleccionar imagen del producto"
                  />
                  <p className="text-xs text-text-secondary text-center mt-2">
                    Foto (opcional)
                  </p>
                </div>
              </div>

              <div className="sm:col-span-6">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  Nombre del Producto *
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                  placeholder="Ej. Paquete Premium"
                  aria-required="true"
                  aria-invalid={errors.name ? "true" : "false"}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p
                    id="name-error"
                    className="mt-2 text-sm text-error"
                    role="alert"
                  >
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  Categoría *
                </label>
                <input
                  id="category"
                  type="text"
                  {...register("category")}
                  className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                  placeholder="Ej. Servicios"
                  aria-required="true"
                  aria-invalid={errors.category ? "true" : "false"}
                  aria-describedby={
                    errors.category ? "category-error" : undefined
                  }
                />
                {errors.category && (
                  <p
                    id="category-error"
                    className="mt-2 text-sm text-error"
                    role="alert"
                  >
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="base_price"
                  className="block text-sm font-medium text-text-secondary mb-2"
                >
                  Precio Base ($) *
                </label>
                <input
                  id="base_price"
                  type="number"
                  step="0.01"
                  {...register("base_price")}
                  className="w-full rounded-xl shadow-sm border border-border bg-card text-text p-3 transition-shadow focus:ring-2 focus:ring-primary/20"
                  aria-required="true"
                  aria-invalid={errors.base_price ? "true" : "false"}
                  aria-describedby={
                    errors.base_price ? "base_price-error" : undefined
                  }
                />
                {errors.base_price && (
                  <p
                    id="base_price-error"
                    className="mt-2 text-sm text-error"
                    role="alert"
                  >
                    {errors.base_price.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-alt">
                  <div>
                    <p className="text-sm font-medium text-text">
                      Producto activo
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Los productos inactivos no aparecen disponibles en
                      cotizaciones
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${isActive ? "bg-primary" : "bg-border"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${isActive ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Composición / Insumos */}
        <div className="bg-card shadow-sm border border-border px-4 py-8 rounded-3xl sm:p-10 flex flex-col">
          <h3 className="text-lg leading-6 font-medium text-text mb-4 flex items-center">
            <Layers className="h-5 w-5 mr-2 text-primary" aria-hidden="true" />
            Composición / Insumos (por unidad/persona)
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Define qué insumos y qué cantidad se necesitan para 1 unidad de este
            producto. Solo insumos generan costo.
          </p>

          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {ingredientEntries.map(({ item, originalIndex }) => (
              <div
                key={originalIndex}
                className="bg-surface-alt p-4 rounded-xl relative group border border-border"
              >
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(originalIndex)}
                  className="absolute top-1 right-1 text-text-secondary hover:text-error transition-colors"
                  aria-label={`Eliminar insumo`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="mb-2 pr-6">
                  <label
                    htmlFor={`ingredient-select-${originalIndex}`}
                    className="block text-xs text-text-secondary mb-1"
                  >
                    Insumo
                  </label>
                  <select
                    id={`ingredient-select-${originalIndex}`}
                    value={item.inventory_id}
                    onChange={(e) =>
                      handleIngredientChange(
                        originalIndex,
                        "inventory_id",
                        e.target.value,
                      )
                    }
                    className="block w-full p-2.5 text-sm border-border rounded-xl shadow-sm bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                    aria-label={`Seleccionar insumo`}
                  >
                    <option value="">Seleccionar insumo</option>
                    {ingredientInventoryItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.ingredient_name} ({i.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="w-1/2">
                    <label
                      htmlFor={`quantity-${originalIndex}`}
                      className="text-xs text-text-secondary"
                    >
                      Cant.
                    </label>
                    <input
                      id={`quantity-${originalIndex}`}
                      type="number"
                      step="0.001"
                      value={item.quantity_required}
                      onChange={(e) =>
                        handleIngredientChange(
                          originalIndex,
                          "quantity_required",
                          Number(e.target.value),
                        )
                      }
                      className="block w-full p-2.5 text-sm border-border rounded-xl shadow-sm bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                      aria-label={`Cantidad de insumo`}
                    />
                  </div>
                  <div className="w-1/2 text-right">
                    <span className="text-xs text-text-secondary block">
                      Costo Est.
                    </span>
                    <span className="text-sm font-medium text-text">
                      ${(item.quantity_required * item.unit_cost).toFixed(2)}
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.bring_to_event}
                    onChange={(e) =>
                      handleIngredientChange(
                        originalIndex,
                        "bring_to_event",
                        e.target.checked,
                      )
                    }
                    className="rounded border-border text-primary focus:ring-primary/20 h-4 w-4"
                  />
                  <span className="text-xs text-text-secondary">
                    Llevar al evento
                  </span>
                </label>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddIngredient}
              className="w-full flex items-center justify-center px-4 py-3 border border-border shadow-sm text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt transition-colors"
              aria-label="Agregar un insumo adicional a la composición"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Agregar
              Insumo
            </button>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">
                Costo Total por Unidad
              </span>
              <span className="text-lg font-bold text-text">
                ${calculateTotalCost().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Maquinaria / Equipo Necesario */}
        <div className="bg-card shadow-sm border border-border px-4 py-8 rounded-3xl sm:p-10 flex flex-col">
          <h3 className="text-lg leading-6 font-medium text-text mb-4 flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-info" aria-hidden="true" />
            Maquinaria / Equipo Necesario
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Equipo y maquinaria necesaria para preparar este producto. No se
            incluye en el costo (activos reutilizables).
          </p>

          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {equipmentEntries.map(({ item, originalIndex }) => (
              <div
                key={originalIndex}
                className="bg-surface-alt p-4 rounded-xl relative group border border-border"
              >
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(originalIndex)}
                  className="absolute top-1 right-1 text-text-secondary hover:text-error transition-colors"
                  aria-label={`Eliminar equipo`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="mb-2 pr-6">
                  <label
                    htmlFor={`equipment-select-${originalIndex}`}
                    className="block text-xs text-text-secondary mb-1"
                  >
                    Equipo
                  </label>
                  <select
                    id={`equipment-select-${originalIndex}`}
                    value={item.inventory_id}
                    onChange={(e) =>
                      handleIngredientChange(
                        originalIndex,
                        "inventory_id",
                        e.target.value,
                      )
                    }
                    className="block w-full p-2.5 text-sm border-border rounded-xl shadow-sm bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                    aria-label={`Seleccionar equipo`}
                  >
                    <option value="">Seleccionar equipo</option>
                    {equipmentInventoryItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.ingredient_name} ({i.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="w-1/2">
                    <label
                      htmlFor={`eq-capacity-${originalIndex}`}
                      className="text-xs text-text-secondary"
                    >
                      Capacidad (unid./equipo)
                    </label>
                    <input
                      id={`eq-capacity-${originalIndex}`}
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Ej: 100"
                      value={item.capacity ?? ""}
                      onChange={(e) =>
                        handleIngredientChange(
                          originalIndex,
                          "capacity",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                      className="block w-full p-2.5 text-sm border-border rounded-xl shadow-sm bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                      aria-label={`Capacidad del equipo (unidades de producto por pieza)`}
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      {item.capacity
                        ? `1 pieza por cada ${item.capacity} unid.`
                        : "Fijo: 1 pieza siempre"}
                    </p>
                  </div>
                  <div className="w-1/2 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-info/10 text-info">
                      Sin costo - Reutilizable
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddEquipment}
              className="w-full flex items-center justify-center px-4 py-3 border border-border shadow-sm text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt transition-colors"
              aria-label="Agregar equipo necesario"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Agregar
              Equipo
            </button>
          </div>
        </div>

        {/* Insumos por Evento */}
        <div className="bg-card shadow-sm border border-border px-4 py-8 rounded-3xl sm:p-10 flex flex-col">
          <h3 className="text-lg leading-6 font-medium text-text mb-4 flex items-center">
            <Fuel className="h-5 w-5 mr-2 text-warning" aria-hidden="true" />
            Insumos por Evento (costo fijo por evento)
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Insumos con cantidad fija por evento que no escala con unidades del
            producto (ej. aceite, gas). Se contabilizan como costo del evento.
          </p>

          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {supplyEntries.map(({ item, originalIndex }) => (
              <div
                key={originalIndex}
                className="bg-surface-alt p-4 rounded-xl relative group border border-border"
              >
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(originalIndex)}
                  className="absolute top-1 right-1 text-text-secondary hover:text-error transition-colors"
                  aria-label="Eliminar insumo por evento"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="mb-2 pr-6">
                  <label
                    htmlFor={`supply-select-${originalIndex}`}
                    className="block text-xs text-text-secondary mb-1"
                  >
                    Insumo por Evento
                  </label>
                  <select
                    id={`supply-select-${originalIndex}`}
                    value={item.inventory_id}
                    onChange={(e) =>
                      handleIngredientChange(
                        originalIndex,
                        "inventory_id",
                        e.target.value,
                      )
                    }
                    className="block w-full p-2.5 text-sm border-border rounded-xl shadow-sm bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                    aria-label="Seleccionar insumo por evento"
                  >
                    <option value="">Seleccionar insumo</option>
                    {supplyInventoryItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.ingredient_name} ({i.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="w-1/2">
                    <label
                      htmlFor={`supply-qty-${originalIndex}`}
                      className="text-xs text-text-secondary"
                    >
                      Cant. por evento
                    </label>
                    <input
                      id={`supply-qty-${originalIndex}`}
                      type="number"
                      step="0.001"
                      value={item.quantity_required}
                      onChange={(e) =>
                        handleIngredientChange(
                          originalIndex,
                          "quantity_required",
                          Number(e.target.value),
                        )
                      }
                      className="block w-full p-2.5 text-sm border-border rounded-xl shadow-sm bg-card text-text transition-shadow focus:ring-2 focus:ring-primary/20"
                      aria-label="Cantidad por evento"
                    />
                  </div>
                  <div className="w-1/2 text-right">
                    <span className="text-xs text-text-secondary block">
                      Costo por evento
                    </span>
                    <span className="text-sm font-medium text-warning">
                      ${(item.quantity_required * item.unit_cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddSupply}
              className="w-full flex items-center justify-center px-4 py-3 border border-border shadow-sm text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt transition-colors"
              aria-label="Agregar insumo por evento"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Agregar
              Insumo por Evento
            </button>
          </div>

          {supplyEntries.length > 0 && (
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-secondary">
                  Costo por Evento (Insumos Fijos)
                </span>
                <span className="text-lg font-bold text-warning">
                  ${calculatePerEventCost().toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Este costo se suma al costo total del evento, no al costo por
                unidad.
              </p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="bg-card py-2.5 px-6 border border-border rounded-xl shadow-sm text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={isLoading}
            className="inline-flex justify-center py-2.5 px-8 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white premium-gradient hover:opacity-90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-opacity"
            aria-label={
              isLoading ? "Guardando producto..." : "Guardar producto"
            }
          >
            <Save className="h-5 w-5 mr-2" aria-hidden="true" />
            {isLoading ? "Guardando..." : "Guardar Producto"}
          </button>
        </div>
      </div>
    </div>
  );
};
