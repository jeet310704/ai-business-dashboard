import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Prevent Next.js from picking up C:\Users\Admin\package-lock.json as workspace root
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
