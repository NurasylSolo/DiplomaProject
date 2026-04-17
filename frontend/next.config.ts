import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack workspace root to this folder so it resolves npm
  // packages (tailwindcss, react, etc.) from `frontend/node_modules`
  // instead of climbing up to the monorepo root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
