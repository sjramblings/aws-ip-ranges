import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { GlobePage } from "./GlobePage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobePage />
  </StrictMode>,
);
