import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";
import "./app.css";

/*
 * Registers the service worker that makes a cold start work offline.
 *
 * Updates are taken silently. Every write lands in IndexedDB before it is
 * sent, so a new version arriving costs nothing that was not already
 * saved — and prompting someone to reload is a interruption the product
 * has no reason to spend.
 *
 * Failure is not worth reporting: an unsupported browser or a blocked
 * registration only means this visit has no offline shell, and everything
 * else still works.
 */
registerSW({ immediate: true, onRegisterError: () => undefined });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
