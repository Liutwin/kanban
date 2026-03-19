import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicRoute } from "./components/PublicRoute";
import Login           from "./pages/Login";
import Register        from "./pages/Register";
import ForgotPassword  from "./pages/ForgotPassword";
import ResetPassword   from "./pages/ResetPassword";
import Boards      from "./pages/Boards";
import Dashboard   from "./pages/Dashboard";
import LogsUsers   from "./pages/LogsUsers";
import LogsBoards  from "./pages/LogsBoards";
import MyTasks     from "./pages/MyTasks";
import Admin       from "./pages/Admin";
import Profile     from "./pages/Profile";

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
        <Route path="/forgot-password" element={
          <PublicRoute><ForgotPassword /></PublicRoute>
        } />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/boards" element={
          <ProtectedRoute><Boards /></ProtectedRoute>
        } />
        <Route path="/boards/:id" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />

        {/* Journal utilisateurs */}
        <Route path="/logs/users" element={
          <ProtectedRoute><LogsUsers /></ProtectedRoute>
        } />
        <Route path="/logs/users/:userSlug" element={
          <ProtectedRoute><LogsUsers /></ProtectedRoute>
        } />

        {/* Journal tableaux */}
        <Route path="/logs/boards/:boardId" element={
          <ProtectedRoute><LogsBoards /></ProtectedRoute>
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