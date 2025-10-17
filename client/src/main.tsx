import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { initializeGoogleTranslateCompatibility } from "@/utils/google-translate-compatibility";
import { suppressAuthErrors } from "@/utils/suppress-auth-errors";


suppressAuthErrors();

initializeGoogleTranslateCompatibility();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light">
    <App />
  </ThemeProvider>
);
