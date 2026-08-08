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

export const metadata = {
  title: "Hariram Accounting",
  description: "Hariram Motors Accounting & Inventory Software",
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full bg-slate-50`}>
      <body className="flex flex-col md:flex-row h-screen w-full overflow-hidden text-slate-900 m-0">
        <Sidebar session={session} />
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </div>
      </body>
    </html>
  );
}
