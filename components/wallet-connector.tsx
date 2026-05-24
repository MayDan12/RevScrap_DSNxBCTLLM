"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Wallet, Check, Copy, ExternalLink, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function WalletConnector() {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [balance, setBalance] = useState(0)
  const [copied, setCopied] = useState(false)

  const wallets = [
    {
      name: "Nami",
      description: "Popular Cardano wallet",
      icon: "🦋",
    },
    {
      name: "Eternl",
      description: "Feature-rich wallet",
      icon: "♾️",
    },
    {
      name: "Flint",
      description: "Simple and secure",
      icon: "🔥",
    },
    {
      name: "Lace",
      description: "IOG's official wallet",
      icon: "🎴",
    },
  ]

  const connectWallet = (walletName: string) => {
    // Simulate wallet connection
    setTimeout(() => {
      setIsConnected(true)
      setWalletAddress("addr1qxy...abc123")
      setBalance(127.45)
      setIsOpen(false)
    }, 1000)
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setWalletAddress("")
    setBalance(0)
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2" onClick={() => setIsOpen(true)}>
          <Wallet className="h-4 w-4" />
          <span className="font-mono text-sm">{balance.toFixed(2)} ADA</span>
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Connected Wallet</DialogTitle>
              <DialogDescription>View your Cardano wallet details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Balance</p>
                  <p className="text-2xl font-bold">{balance.toFixed(2)} ADA</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-md bg-muted text-sm font-mono">{walletAddress}</code>
                  <Button size="icon" variant="outline" onClick={copyAddress}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Button className="w-full bg-transparent" variant="outline" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    View on Explorer
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button className="w-full" variant="destructive" onClick={disconnectWallet}>
                  Disconnect Wallet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2" onClick={() => setIsOpen(true)}>
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>Choose a Cardano wallet to connect with EcoScrap</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <Card
                key={wallet.name}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => connectWallet(wallet.name)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{wallet.icon}</div>
                      <div>
                        <div className="font-semibold">{wallet.name}</div>
                        <div className="text-sm text-muted-foreground">{wallet.description}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground pt-2">
            New to Cardano?{" "}
            <a href="#" className="text-primary hover:underline">
              Learn about wallets
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
