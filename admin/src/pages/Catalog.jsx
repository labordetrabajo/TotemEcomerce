import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { Icon } from "../components/Icons";
import { apiRequest, getAssetUrl } from "../services/api";
import "./Catalog.css";

const EMPTY_PRODUCT = {
  name: "",
  description: "",
  price: "",
  stock: "",
  categoryId: "",
  image: null,
};

const formatPrice = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

function Catalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [productError, setProductError] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const loadData = async () => {
    try {
      setPageError("");
      const [productData, categoryData] = await Promise.all([
        apiRequest("/products"),
        apiRequest("/categories"),
      ]);

      setProducts(Array.isArray(productData) ? productData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (error) {
      console.error(error);
      setPageError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name?.toLowerCase().includes(normalizedSearch) ||
        product.description?.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        categoryFilter === "all" ||
        String(product.categoryId || "none") === categoryFilter;

      const stock = Number(product.stock || 0);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "available" && stock > 5) ||
        (stockFilter === "low" && stock > 0 && stock <= 5) ||
        (stockFilter === "out" && stock <= 0);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, categoryFilter, stockFilter]);

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock || 0),
    0
  );
  const lowStockCount = products.filter(
    (product) => Number(product.stock) > 0 && Number(product.stock) <= 5
  ).length;
  const outOfStockCount = products.filter(
    (product) => Number(product.stock) <= 0
  ).length;

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductForm(EMPTY_PRODUCT);
    setImagePreview(null);
    setProductError("");
  };

  const openNewProduct = () => {
    resetProductForm();
    setProductModalOpen(true);
  };

  const openEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
      categoryId: product.categoryId ? String(product.categoryId) : "",
      image: null,
    });
    setImagePreview(getAssetUrl(product.image));
    setProductError("");
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    if (savingProduct) return;
    setProductModalOpen(false);
    resetProductForm();
  };

  const handleProductChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "image") {
      const file = files?.[0] || null;
      setProductForm((current) => ({ ...current, image: file }));

      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
      setImagePreview(file ? URL.createObjectURL(file) : null);
      return;
    }

    setProductForm((current) => ({ ...current, [name]: value }));
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();

    if (!productForm.name.trim()) {
      setProductError("Ingresá el nombre del producto.");
      return;
    }

    if (Number(productForm.price) < 0 || Number(productForm.stock) < 0) {
      setProductError("Precio y stock no pueden ser negativos.");
      return;
    }

    try {
      setSavingProduct(true);
      setProductError("");

      const body = new FormData();
      body.append("name", productForm.name.trim());
      body.append("description", productForm.description.trim());
      body.append("price", String(Number(productForm.price)));
      body.append("stock", String(Number(productForm.stock)));

      body.append("categoryId", productForm.categoryId || "");

      if (productForm.image) {
        body.append("image", productForm.image);
      }

      await apiRequest(
        editingProductId ? `/products/${editingProductId}` : "/products",
        {
          method: editingProductId ? "PUT" : "POST",
          body,
        }
      );

      await loadData();
      closeProductModal();
    } catch (error) {
      console.error(error);
      setProductError(error.message);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `¿Eliminar “${product.name}”? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/products/${product.id}`, { method: "DELETE" });
      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );
    } catch (error) {
      window.alert(error.message);
    }
  };

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryError("");
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryError("");
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    if (savingCategory) return;
    setCategoryModalOpen(false);
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryError("");
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();

    if (!categoryName.trim()) {
      setCategoryError("Ingresá un nombre para la categoría.");
      return;
    }

    try {
      setSavingCategory(true);
      setCategoryError("");

      await apiRequest(
        editingCategoryId ? `/categories/${editingCategoryId}` : "/categories",
        {
          method: editingCategoryId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryName.trim() }),
        }
      );

      await loadData();
      closeCategoryModal();
    } catch (error) {
      console.error(error);
      setCategoryError(error.message);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    const confirmed = window.confirm(
      `¿Eliminar la categoría “${category.name}”?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/categories/${category.id}`, { method: "DELETE" });
      await loadData();
    } catch (error) {
      window.alert(
        `${error.message}. Si tiene productos asociados, movelos antes a otra categoría.`
      );
    }
  };

  return (
    <>
      <div className="page-actions">
        <div className="page-actions-copy">
          <h2>Catálogo del comercio</h2>
          <p>Mantené precios, imágenes y existencias siempre actualizados.</p>
        </div>
        <button type="button" className="primary-button" onClick={openNewProduct}>
          <Icon name="plus" size={18} />
          Nuevo producto
        </button>
      </div>

      {pageError && (
        <p className="page-error">
          <Icon name="alert" size={18} />
          {pageError}
        </p>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Productos</span>
            <span className="stat-icon"><Icon name="products" size={18} /></span>
          </div>
          <strong>{products.length}</strong>
          <small>Productos cargados</small>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Stock total</span>
            <span className="stat-icon"><Icon name="category" size={18} /></span>
          </div>
          <strong>{totalStock}</strong>
          <small>Unidades disponibles</small>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Stock bajo</span>
            <span className="stat-icon"><Icon name="alert" size={18} /></span>
          </div>
          <strong>{lowStockCount}</strong>
          <small>Productos con 5 unidades o menos</small>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Categorías</span>
            <span className="stat-icon"><Icon name="category" size={18} /></span>
          </div>
          <strong>{categories.length}</strong>
          <small>{outOfStockCount} producto(s) sin stock</small>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Productos</h3>
            <p>{filteredProducts.length} resultado(s)</p>
          </div>
          <button type="button" className="secondary-button" onClick={loadData}>
            <Icon name="refresh" size={17} />
            Actualizar
          </button>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o descripción"
            />
          </label>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="all">Todas las categorías</option>
            <option value="none">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value)}
            aria-label="Filtrar por stock"
          >
            <option value="all">Todo el stock</option>
            <option value="available">Disponible</option>
            <option value="low">Stock bajo</option>
            <option value="out">Sin stock</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state">
            <div>
              <div className="empty-state-icon"><Icon name="refresh" /></div>
              <h3>Cargando catálogo…</h3>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div>
              <div className="empty-state-icon"><Icon name="search" /></div>
              <h3>No encontramos productos</h3>
              <p>Probá con otros filtros o cargá un nuevo producto.</p>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table product-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stock = Number(product.stock || 0);
                  const imageUrl = getAssetUrl(product.image);

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="product-cell">
                          <div className="product-thumb">
                            {imageUrl ? (
                              <img src={imageUrl} alt="" />
                            ) : (
                              <span>{product.name?.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <span className="table-primary">{product.name}</span>
                            <span className="table-secondary">
                              {product.description || `Producto #${product.id}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{product.category?.name || "Sin categoría"}</td>
                      <td><span className="price-cell">{formatPrice(product.price)}</span></td>
                      <td>
                        <span
                          className={`stock-pill ${
                            stock <= 0 ? "out" : stock <= 5 ? "low" : "ok"
                          }`}
                        >
                          {stock <= 0 ? "Sin stock" : `${stock} un.`}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-action-button"
                            onClick={() => openEditProduct(product)}
                            aria-label={`Editar ${product.name}`}
                            title="Editar"
                          >
                            <Icon name="edit" size={17} />
                          </button>
                          <button
                            type="button"
                            className="table-action-button danger"
                            onClick={() => handleDeleteProduct(product)}
                            aria-label={`Eliminar ${product.name}`}
                            title="Eliminar"
                          >
                            <Icon name="trash" size={17} />
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
      </section>

      <section className="panel-card categories-panel">
        <div className="panel-header">
          <div>
            <h3>Categorías</h3>
            <p>Organizá los productos que verá el cliente.</p>
          </div>
          <button type="button" className="secondary-button" onClick={openNewCategory}>
            <Icon name="plus" size={17} />
            Nueva categoría
          </button>
        </div>

        <div className="category-grid">
          {categories.map((category) => {
            const productCount = products.filter(
              (product) => product.categoryId === category.id
            ).length;

            return (
              <article key={category.id} className="category-card">
                <div className="category-card-icon"><Icon name="category" size={20} /></div>
                <div className="category-card-copy">
                  <strong>{category.name}</strong>
                  <span>{productCount} producto(s)</span>
                </div>
                <div className="category-card-actions">
                  <button type="button" className="table-action-button" onClick={() => openEditCategory(category)}>
                    <Icon name="edit" size={16} />
                  </button>
                  <button type="button" className="table-action-button danger" onClick={() => handleDeleteCategory(category)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <Modal
        open={productModalOpen}
        title={editingProductId ? "Editar producto" : "Nuevo producto"}
        subtitle="Los cambios se reflejan automáticamente en el tótem."
        onClose={closeProductModal}
        size="lg"
      >
        <form onSubmit={handleProductSubmit}>
          {productError && <p className="form-error"><Icon name="alert" size={17} />{productError}</p>}

          <div className="product-form-layout">
            <label className="image-upload-card">
              <input
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleProductChange}
              />
              {imagePreview ? (
                <img src={imagePreview} alt="Vista previa" />
              ) : (
                <div>
                  <Icon name="image" size={28} />
                  <strong>Agregar imagen</strong>
                  <span>PNG, JPG o WebP</span>
                </div>
              )}
              <span className="image-upload-overlay">Cambiar imagen</span>
            </label>

            <div className="form-grid">
              <div className="form-field full">
                <label htmlFor="product-name">Nombre</label>
                <input id="product-name" name="name" value={productForm.name} onChange={handleProductChange} placeholder="Ej. Pancho completo" autoFocus />
              </div>

              <div className="form-field full">
                <label htmlFor="product-description">Descripción</label>
                <textarea id="product-description" name="description" value={productForm.description} onChange={handleProductChange} placeholder="Breve descripción para el cliente" />
              </div>

              <div className="form-field">
                <label htmlFor="product-price">Precio</label>
                <input id="product-price" name="price" type="number" min="0" step="0.01" value={productForm.price} onChange={handleProductChange} placeholder="0" required />
              </div>

              <div className="form-field">
                <label htmlFor="product-stock">Stock</label>
                <input id="product-stock" name="stock" type="number" min="0" step="1" value={productForm.stock} onChange={handleProductChange} placeholder="0" required />
              </div>

              <div className="form-field full">
                <label htmlFor="product-category">Categoría</label>
                <select id="product-category" name="categoryId" value={productForm.categoryId} onChange={handleProductChange}>
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={closeProductModal}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={savingProduct}>
              {savingProduct ? "Guardando…" : editingProductId ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={categoryModalOpen}
        title={editingCategoryId ? "Editar categoría" : "Nueva categoría"}
        subtitle="Usá nombres breves y fáciles de reconocer."
        onClose={closeCategoryModal}
      >
        <form onSubmit={handleCategorySubmit}>
          {categoryError && <p className="form-error"><Icon name="alert" size={17} />{categoryError}</p>}
          <div className="form-field">
            <label htmlFor="category-name">Nombre</label>
            <input id="category-name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ej. Bebidas" autoFocus />
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={closeCategoryModal}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={savingCategory}>
              {savingCategory ? "Guardando…" : editingCategoryId ? "Guardar cambios" : "Crear categoría"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default Catalog;
