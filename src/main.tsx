import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, initInstallPrompt } from "./lib/pwa";

const BUILD_VERSION = "v2.2-pwa";
console.log(`[PropertyMaint] Build: ${BUILD_VERSION}`);

registerServiceWorker();
initInstallPrompt();

createRoot(document.getElementById("root")!).render(<App />);
