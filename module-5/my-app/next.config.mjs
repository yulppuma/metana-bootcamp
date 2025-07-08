/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    },
};

export default nextConfig;
