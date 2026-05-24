"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Upload, ImageIcon } from "lucide-react"
import { appraiseWaste } from "@/app/actions/appraise-waste"

interface AIAppraisalCardProps {
  onAppraisalComplete: (data: unknown) => void
}

export function AIAppraisalCard({ onAppraisalComplete }: AIAppraisalCardProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setError(null)

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        // Pass base64 to server action
        const result = await appraiseWaste(base64String)
        
        if (result.success && result.data) {
          onAppraisalComplete({
             image: base64String,
             ...result.data
          })
        } else {
          setError(result.error || "Something went wrong. Please try again.")
        }
        setIsScanning(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError("Failed to process image")
      setIsScanning(false)
    }
  }

  return (
    <Card className="mb-6 border-primary/50 bg-primary/5 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40"></div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          EcoScout AI Appraiser
        </CardTitle>
        <CardDescription>
          Upload a photo and let our AI instantly identify your waste and suggest a fair price.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isScanning ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/20 rounded-xl bg-background hover:bg-muted/50 transition-colors cursor-pointer relative">
            <input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept="image/*"
              onChange={handleImageUpload}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium text-center">Tap to snap a photo or upload</p>
            <p className="text-sm text-muted-foreground mt-1">Get instant appraisal</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <div className="h-16 w-16 rounded-full flex items-center justify-center bg-primary/10">
                <ImageIcon className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Analyzing your items...</h3>
            <p className="text-sm text-muted-foreground">Identifying materials, estimating weight, and calculating current market rates.</p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
