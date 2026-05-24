import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Recycle } from "lucide-react";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EcoScrap - Turning Waste into Wealth",
  description:
    "A decentralized marketplace for recycling and e-waste recovery on Cardano. Connect with collectors, sell recyclables, and build financial inclusion in Lagos.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {/* <Header /> */}
        <main>{children}</main>
        {/* <footer className=" border-t py-12 bg-muted/30">
          <div className="container px-4">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Recycle className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">EcoScrap</span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {"Built for CATS Hackathon & Cardano Africa Tech Summit 2026"}
              </p>
            </div>
          </div>
        </footer> */}
      </body>
    </html>
  );
}
