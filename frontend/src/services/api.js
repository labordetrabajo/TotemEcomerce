const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const request = async (url, options = {}) => {
  const response = await fetch(url, options);

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error || `Error del servidor: ${response.status}`
    );
  }

  return data;
};

const getElectronTotemToken = async () => {
  if (!window.electronAPI?.isElectron) {
    return null;
  }

  if (!window.totemSession?.get) {
    return null;
  }

  const session = await window.totemSession.get();
  return session?.token || null;
};

export const getProducts = async () => {
  return await request(`${API}/products`);
};

export const getCategories = async () => {
  return await request(`${API}/categories`);
};

export const loginTotem = async (username, password) => {
  return await request(`${API}/totems/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
};

export const validateTotemSession = async (token) => {
  return await request(`${API}/totems/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const createOrder = async (items) => {
  const token = await getElectronTotemToken();

  return await request(`${API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
    body: JSON.stringify({ items }),
  });
};

export const createPayment = async (orderId) => {
  return await request(`${API}/payments/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId }),
  });
};

export const createQrPayment = async (orderId) => {
  return await request(`${API}/payments/qr/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId }),
  });
};

export const getQrPaymentStatus = async (orderId) => {
  return await request(`${API}/payments/qr/status/${orderId}`);
};

export const cancelQrPayment = async (orderId) => {
  return await request(`${API}/payments/qr/cancel/${orderId}`, {
    method: "POST",
  });
};
