import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "@/lib/errors";
import { AuthProvider } from "@/auth/AuthContext";
import InvitationPage from "@/auth/InvitationPage";
import LoginPage from "@/auth/LoginPage";
import RegisterPage from "@/auth/RegisterPage";
import { RequireAuth } from "@/auth/RequireAuth";
import VerifyEmailPage from "@/auth/VerifyEmailPage";
import AppLayout from "@/layout/AppLayout";
import ForbiddenPage from "@/pages/ForbiddenPage";
import DrinksPage from "@/pages/drinks/DrinksPage";
import HomePage from "@/pages/HomePage";
import InvitationsPage from "@/pages/invitations/InvitationsPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import StockPage from "@/pages/stock/StockPage";
import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Inutile de rejouer une requête refusée par le serveur (4xx) : seules les pannes réseau / 5xx sont retentées.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/invitation/:token" element={<InvitationPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/boissons" element={<DrinksPage />} />
                <Route element={<RequireAuth roles={["admin", "gestionnaire"]} />}>
                  <Route path="/stock" element={<StockPage />} />
                </Route>
                <Route element={<RequireAuth roles={["admin"]} />}>
                  <Route path="/invitations" element={<InvitationsPage />} />
                </Route>
                <Route path="/profil" element={<ProfilePage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
