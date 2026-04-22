import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agent-control-plane/config", "@agent-control-plane/domain", "@agent-control-plane/ui"]
};

export default nextConfig;

