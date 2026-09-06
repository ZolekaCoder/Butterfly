import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Read the one shared .env at the repo root instead of requiring a second
// env file inside web/ — judges only ever configure one file.
export default defineConfig({
  plugins: [react()],
  envDir: "..",
});
