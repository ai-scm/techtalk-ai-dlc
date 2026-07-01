import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

// Auth pages
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";

// Catalog pages
import CatalogPage from "@/features/catalog/CatalogPage";
import PetDetailPage from "@/features/catalog/PetDetailPage";

// Publishing pages
import MyPetsPage from "@/features/publishing/MyPetsPage";
import CreatePetPage from "@/features/publishing/CreatePetPage";
import EditPetPage from "@/features/publishing/EditPetPage";

// Adoption pages
import MyRequestsPage from "@/features/adoption/MyRequestsPage";
import PetRequestsPage from "@/features/adoption/PetRequestsPage";

// Account pages
import AccountPage from "@/features/account/AccountPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/catalog/:petId" element={<PetDetailPage />} />

              {/* Protected: Publisher/Foundation */}
              <Route
                path="/pets/mine"
                element={
                  <ProtectedRoute allowedRoles={["PUBLISHER", "FOUNDATION"]}>
                    <MyPetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pets/new"
                element={
                  <ProtectedRoute allowedRoles={["PUBLISHER", "FOUNDATION"]}>
                    <CreatePetPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pets/:petId/edit"
                element={
                  <ProtectedRoute allowedRoles={["PUBLISHER", "FOUNDATION"]}>
                    <EditPetPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pets/:petId/requests"
                element={
                  <ProtectedRoute allowedRoles={["PUBLISHER", "FOUNDATION"]}>
                    <PetRequestsPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected: Adopter */}
              <Route
                path="/requests/mine"
                element={
                  <ProtectedRoute allowedRoles={["ADOPTER"]}>
                    <MyRequestsPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected: Any authenticated user */}
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/catalog" replace />} />
              <Route path="*" element={<Navigate to="/catalog" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
