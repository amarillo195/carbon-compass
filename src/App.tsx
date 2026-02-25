import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import MealsPage from "./pages/MealsPage";
import TripsPage from "./pages/TripsPage";
import TipsPage from "./pages/TipsPage";
import SharePage from "./pages/SharePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/tips" element={<TipsPage />} />
            <Route path="/share" element={<SharePage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
