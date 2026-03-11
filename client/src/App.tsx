import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login       from "./pages/Login";
import Register    from "./pages/Register";
import Boards      from "./pages/Boards";
import TablePage   from "./pages/TablePage";
import Logs        from "./pages/Logs";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <ProtectedRoute><Boards /></ProtectedRoute>
        } />
        <Route path="/tables/:id" element={
          <ProtectedRoute><TablePage /></ProtectedRoute>
        } />
        <Route path="/logs" element={
          <ProtectedRoute><Logs /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
