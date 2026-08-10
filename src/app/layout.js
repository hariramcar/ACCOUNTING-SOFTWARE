import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getSession } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const viewport = {
  themeColor: '#f8fafc', // slate-50 to match background, or slate-950 if we want a dark top bar
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevents iOS auto-zoom on inputs
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata = {
  title: "Hariram Accounting",
  description: "Hariram Motors Accounting & Inventory Software",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Hariram Accounting",
  },
  manifest: '/manifest.json',
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full bg-slate-50`}>
      <body className="flex flex-col md:flex-row h-[100dvh] md:h-screen w-full overflow-hidden text-slate-900 m-0 relative bg-slate-50">
        <Sidebar session={session} />
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-28 pb-safe md:pb-0 relative scroll-smooth">
          {children}
        </div>
      </body>
    </html>
  );
}
