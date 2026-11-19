/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: process.env.NEXT_DIST_DIR || ".next",
    // Hosts de la LAN, separados por coma y sin protocolo ni puerto.
    allowedDevOrigins: (process.env.NEXT_DEV_HOSTS || "")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean),
    images: {
        // Las imágenes de los títulos salen de la base y pueden apuntar a
        // cualquier sitio (wikimedia, diarios, etc.). Cualquier http(s) vale;
        // si una URL falla, el componente ya muestra el emoji de respaldo.
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
            {
                protocol: "http",
                hostname: "**",
            },
        ],
    },
};



export default nextConfig;
