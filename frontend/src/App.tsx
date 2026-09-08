import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ui/theme";
import { Toaster } from "./components/ui/sonner";
import Dashboard from "./pages/Dashboard";
import EndpointDetail from "./pages/EndpointDetail";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/endpoint/:id" element={<EndpointDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  );
}