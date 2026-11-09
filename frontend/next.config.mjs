/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: process.env.NEXT_DIST_DIR || ".next",
    allowedDevOrigins: ["192.168.0.59", "localhost", "127.0.0.1"],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "upload.wikimedia.org",
            },
            {
                protocol: "https",
                hostname: "thumb.wikimedia.org",
            },
        ],
    },
};



export default nextConfig;
