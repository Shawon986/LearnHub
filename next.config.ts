import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Chat attachments allow images up to 5 MB and documents up to 15 MB.
      // The default 1 MB Server Action body limit silently rejected most
      // uploads ("Body exceeded 1 MB limit") — leave headroom for the
      // multipart boundary/header overhead on top of the 15 MB file cap.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
