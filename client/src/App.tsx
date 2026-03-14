import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicRoute } from "./components/PublicRoute";
import Login       from "./pages/Login";
import Register    from "./pages/Register";
import Boards      from "./pages/Boards";
import Dashboard   from "./pages/Dashboard";
import Logs        from "./pages/Logs";
import MyTasks from "./pages/MyTasks";
import Admin       from "./pages/Admin";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute><Register /></PublicRoute>
        } />
        <Route path="/boards" element={
          <ProtectedRoute><Boards /></ProtectedRoute>
        } />
        <Route path="/boards/:id" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/logs" element={
          <ProtectedRoute><Logs /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/my-tasks" element={
          <ProtectedRoute><MyTasks /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><Admin /></ProtectedRoute>
        } />
        <Route path="*" element={
          <Navigate to="/boards" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}