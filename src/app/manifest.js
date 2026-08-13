export default function manifest() {
  return {
    name: 'Hariram Accounting & Inventory',
    short_name: 'Hariram',
    description: 'Hariram Motors Accounting & Inventory Software',
    start_url: '/login', // Always start at login, middleware will redirect to proper page if authenticated
    display: 'standalone', // Makes it feel like a native app (hides URL bar)
    background_color: '#f8fafc',
    theme_color: '#4f46e5', // Indigo color for the splash screen
    orientation: 'portrait-primary', // Lock to portrait for best mobile data entry experience
    icons: [
      {
        src: '/3.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/3.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
  };
}
