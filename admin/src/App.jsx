import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import Catalog from "./pages/Catalog";
import Orders from "./pages/Orders";
import Totems from "./pages/Totems";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/totems" element={<Totems />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}

export default App;
