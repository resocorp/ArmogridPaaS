import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ArmogridPaaS - IoT Meter Management",
  description: "Manage your prepaid electricity meters with ease. Quick recharge, real-time analytics, and remote control.",
  keywords: ["electricity", "prepaid meter", "IoT", "energy management", "Armogrid"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="bottom-right" richColors duration={1500} />
      </body>
    </html>
  );
}
