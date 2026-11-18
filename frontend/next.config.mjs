/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: process.env.NEXT_DIST_DIR || ".next",
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
