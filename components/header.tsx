"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, Recycle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { WalletConnector } from "@/components/wallet-connector";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Recycle className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">EcoScrap</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/marketplace"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            Marketplace
          </Link>
          <Link
            href="/for-collectors"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            For Collectors
          </Link>
          <Link
            href="/my-listings"
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            My Listings
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <WalletConnector />
          <Button size="sm" className="hidden md:flex" asChild>
            <Link href="/list-item">List Item</Link>
          </Button>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="/#how-it-works" className="text-base font-medium">
                  How It Works
                </Link>
                <Link href="/marketplace" className="text-base font-medium">
                  Marketplace
                </Link>
                <Link href="/for-collectors" className="text-base font-medium">
                  For Collectors
                </Link>
                <Link href="/my-listings" className="text-base font-medium">
                  My Listings
                </Link>
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <div className="w-full">
                    <WalletConnector />
                  </div>
                  <Button className="w-full" asChild>
                    <Link href="/list-item">List Item</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
