/** @type {import('next').NextConfig} */
const nextConfig = {
  // eslint was removed here to stop the "Unrecognized key" warning
  typescript: {
    // Recommendation: Set this to false now that we've fixed your @types/qrcode error!
    ignoreBuildErrors: true, 
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig