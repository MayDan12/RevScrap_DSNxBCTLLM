"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface PaymentEscrowProps {
  amount: number
  status: "pending" | "locked" | "completed" | "disputed"
  jobTitle: string
  pickupTime?: string
}

export function PaymentEscrow({ amount, status, jobTitle, pickupTime }: PaymentEscrowProps) {
  const [escrowStatus, setEscrowStatus] = useState(status)

  const getStatusBadge = () => {
    switch (escrowStatus) {
      case "pending":
        return (
          <Badge className="bg-secondary/50 text-secondary-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case "locked":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/30">
            <Shield className="mr-1 h-3 w-3" />
            Locked in Escrow
          </Badge>
        )
      case "completed":
        return (
          <Badge className="bg-accent/20 text-accent-foreground border-accent/30">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Released
          </Badge>
        )
      case "disputed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Disputed
          </Badge>
        )
    }
  }

  const getProgressValue = () => {
    switch (escrowStatus) {
      case "pending":
        return 25
      case "locked":
        return 50
      case "completed":
        return 100
      case "disputed":
        return 75
      default:
        return 0
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payment Escrow</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>Secure smart contract ensures safe payment release</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Escrow Amount</p>
            <p className="text-2xl font-bold">{amount.toFixed(2)} ADA</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Transaction Progress</span>
            <span className="text-sm text-muted-foreground">{getProgressValue()}%</span>
          </div>
          <Progress value={getProgressValue()} className="h-2" />
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 mt-0.5">
              <CheckCircle2 className="h-3 w-3 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Payment Locked</p>
              <p className="text-muted-foreground">Funds secured in Plutus smart contract</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full mt-0.5 ${
                escrowStatus === "locked" || escrowStatus === "completed" ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <Clock
                className={`h-3 w-3 ${
                  escrowStatus === "locked" || escrowStatus === "completed" ? "text-primary" : "text-muted-foreground"
                }`}
              />
            </div>
            <div className="flex-1">
              <p className="font-medium">Pickup Scheduled</p>
              <p className="text-muted-foreground">{pickupTime || "Awaiting confirmation"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full mt-0.5 ${
                escrowStatus === "completed" ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <CheckCircle2
                className={`h-3 w-3 ${escrowStatus === "completed" ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
            <div className="flex-1">
              <p className="font-medium">Payment Released</p>
              <p className="text-muted-foreground">Upon successful pickup confirmation</p>
            </div>
          </div>
        </div>

        {escrowStatus === "locked" && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setEscrowStatus("completed")}>
              Confirm Pickup
            </Button>
            <Button variant="outline" onClick={() => setEscrowStatus("disputed")}>
              Report Issue
            </Button>
          </div>
        )}

        {escrowStatus === "completed" && (
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/30">
            <div className="flex items-center gap-2 text-accent-foreground">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">Payment Successfully Released</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Transaction recorded on Cardano blockchain</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
