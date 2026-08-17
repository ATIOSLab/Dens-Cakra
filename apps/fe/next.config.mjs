/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss: ws:",
  "worker-src 'self' blob:",
  "child-src blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "media-src 'self' data: blob: https:",
].join("; ");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy",
          value: contentSecurityPolicy,
        },
      ]
    : []),
];

const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/personel-lapangan/:path*",
        destination: "/dashboard/daftar-petugas-wilayah/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/field-officer/:path*",
        destination: "/dashboard/petugas-wilayah/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/executive/:path*",
        destination: "/dashboard/deputi/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/regional-commander/:path*",
        destination: "/dashboard/kabinda/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/field-coordinator/:path*",
        destination: "/dashboard/koordinator-wilayah/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/oim/:path*",
        destination: "/dashboard/anev/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
