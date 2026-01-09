import { Routes, Route, Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { Layout } from "@/components/layout/Layout";
import { LoginPage } from "@/pages/Login";
import { HomePage } from "@/pages/Home";
import { BoardPage } from "@/pages/Board";
import { ProfilePage } from "@/pages/Profile";
import { MarketplacePage } from "@/pages/Marketplace";
import { Admin } from "@/pages/Admin";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="board/:boardId" element={<BoardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}

export default App;
