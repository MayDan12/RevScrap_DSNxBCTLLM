"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from "lucide-react"

interface Transaction {
  id: string
  type: "received" | "sent"
  amount: number
  description: string
  date: string
  status: "completed" | "pending"
  txHash: string
}

export function TransactionHistory() {
  const transactions: Transaction[] = [
    {
      id: "1",
      type: "received",
      amount: 25.5,
      description: "Payment for 50kg Plastic Bottles",
      date: "2 hours ago",
      status: "completed",
      txHash: "a1b2c3d4e5f6...",
    },
    {
      id: "2",
      type: "sent",
      amount: 45.0,
      description: "Purchase: iPhone 11 Screen",
      date: "1 day ago",
      status: "completed",
      txHash: "f6e5d4c3b2a1...",
    },
    {
      id: "3",
      type: "received",
      amount: 18.0,
      description: "Payment for Metal Cans",
      date: "3 days ago",
      status: "completed",
      txHash: "9876543210ab...",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your on-chain payment records building credit history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    tx.type === "received" ? "bg-accent/10" : "bg-muted"
                  }`}
                >
                  {tx.type === "received" ? (
                    <ArrowDownLeft className="h-5 w-5 text-accent" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{tx.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{tx.date}</span>
                    <span>•</span>
                    <code className="text-xs">{tx.txHash}</code>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-bold ${tx.type === "received" ? "text-accent" : "text-foreground"}`}>
                    {tx.type === "received" ? "+" : "-"}
                    {tx.amount.toFixed(2)} ADA
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {tx.status}
                  </Badge>
                </div>
                <Button size="icon" variant="ghost" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
