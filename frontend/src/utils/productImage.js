const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

const normalizeText = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const getProductFallback = (product = {}) => {
  const text = normalizeText(
    `${product.name || ""} ${product.category?.name || ""}`
  );

  if (text.includes("papa") || text.includes("frit")) {
    return "/product-images/fries.webp";
  }

  if (text.includes("pancho") || text.includes("hot dog")) {
    return "/product-images/hotdog.webp";
  }

  if (
    text.includes("hamburg") ||
    text.includes("burger") ||
    text.includes("cheese")
  ) {
    return "/product-images/burger.webp";
  }

  if (
    text.includes("sprite") ||
    text.includes("lima") ||
    text.includes("limon")
  ) {
    return "/product-images/lemon-soda.webp";
  }

  if (
    text.includes("coca") ||
    text.includes("cola") ||
    text.includes("bebida") ||
    text.includes("gaseosa")
  ) {
    return "/product-images/cola.webp";
  }

  if (
    text.includes("alfajor") ||
    text.includes("chocolate") ||
    text.includes("dulce")
  ) {
    return "/product-images/chocolate.webp";
  }

  return "/product-images/burger.webp";
};

export const getProductImage = (product = {}) => {
  if (!product.image) {
    return getProductFallback(product);
  }

  if (/^https?:\/\//i.test(product.image)) {
    return product.image;
  }

  return `${API_URL}${product.image}`;
};
