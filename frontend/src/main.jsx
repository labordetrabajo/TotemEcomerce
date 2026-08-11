import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App";

import { CartProvider } from "./context/CartContext";
import { TotemAuthProvider } from "./context/TotemAuthContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TotemAuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </TotemAuthProvider>
  </StrictMode>
);
