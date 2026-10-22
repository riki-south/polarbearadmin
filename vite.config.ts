import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, ".", "VITE_");

  return {
    plugins: [react(), tailwindcss()],
    publicDir: environment.VITE_API_BASE_URL ? false : "public",
    define: {
      __LOCAL_DATA_MODE__: JSON.stringify(!environment.VITE_API_BASE_URL),
    },
  };
});
