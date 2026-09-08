import { Toaster as Sonner } from "sonner";
import { useTheme } from "./theme";

export function Toaster() {
  const { theme } = useTheme();
  return <Sonner position="bottom-right" theme={theme} richColors />;
}