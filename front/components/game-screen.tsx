"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2, Trophy, ArrowRight } from "lucide-react"
import { getContract, getPlayerLevel, getPlayerScore, generateProof } from "@/lib/contract"
import { ethers } from "ethers"

// Game levels data
const levels = [
  {
    id: 1,
    image: "/placeholder.svg?height=300&width=400",
    description:
      "این شیء در آشپزخانه استفاده می‌شود. می‌توان با آن مایعات را گرم کرد. معمولاً دارای دسته است و برای جوشاندن آب استفاده می‌شود.",
    answers: ["0xc3318E7EC7CF57296bDC4076268F0Ad1850341b2"],
  },
  {
    id: 2,
    image: "/placeholder.svg?height=300&width=400",
    description:
      "این وسیله برای حمل و نقل استفاده می‌شود. دارای دو چرخ است و با نیروی پا حرکت می‌کند. در شهرهای بزرگ برای فرار از ترافیک بسیار محبوب است.",
    answers: ["0x89d768F75bd1Ae465876046d5e5466D0b1FdbD03"],
  },
  {
    id: 3,
    image: "/placeholder.svg?height=300&width=400",
    description:
      "این حیوان پستاندار است و در جنگل‌های بامبو زندگی می‌کند. سیاه و سفید است و بسیار محبوب و نماد حفاظت از حیات وحش است.",
    answers: ["0x89d768F75bd1Ae465876046d5e5466D0b1FdbD03"], // Using the same address as level 2 for now
  },
]

interface GameScreenProps {
  account: string
}

// Format score to display as if it has 18 decimal points
function formatScore(score: string): string {
  return ethers.formatUnits(score, 18)
}

// Replace the GameScreen component with this implementation
export default function GameScreen({ account }: GameScreenProps) {
  const [currentLevel, setCurrentLevel] = useState(0)
  const [playerScore, setPlayerScore] = useState<string>("0")
  const [guess, setGuess] = useState("")
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [proofGenerating, setProofGenerating] = useState(false)

  // Fetch player's current level and score on component mount
  useEffect(() => {
    async function fetchPlayerData() {
      try {
        if (account) {
          // Get player's current level
          const level = await getPlayerLevel(account)
          setCurrentLevel(level)

          // Get player's score
          const score = await getPlayerScore(account)
          setPlayerScore(score)

          if (level >= levels.length) {
            setGameCompleted(true)
          }
        }
      } catch (error) {
        console.error("Error fetching player data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerData()
  }, [account])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submitting || proofGenerating) return

    try {
      setProofGenerating(true)
      const level = levels[currentLevel]
      const normalizedGuess = guess.trim()

      // Check if the answer is potentially correct (for UI feedback)
      const derivedAddress = ethers.computeAddress(ethers.keccak256(ethers.toUtf8Bytes(normalizedGuess)).substring(2))
      const isCorrect = level.answers.includes(derivedAddress)

      if (!isCorrect) {
        // If the answer is definitely wrong, don't bother generating a proof
        setFeedback({ correct: false, message: "متأسفانه جواب اشتباه است. دوباره تلاش کنید." })

        setTimeout(() => {
          setFeedback(null)
        }, 1500)

        setProofGenerating(false)
        return
      }

      // Generate proof for the answer
      setFeedback({ correct: true, message: "در حال تولید اثبات..." })
      const proof = await generateProof(normalizedGuess, currentLevel, account)
      setProofGenerating(false)

      // Now submit the proof to the contract
      setSubmitting(true)
      setFeedback({ correct: true, message: "در حال ارسال پاسخ..." })

      // Submit to contract with snarkjs proof
      const contract = await getContract()

      // Call the submit function with the proof
      const tx = await contract.submit(proof.answerHash, proof.answerNonce, proof.pA, proof.pB, proof.pC)

      await tx.wait()

      // Show success feedback
      setFeedback({ correct: true, message: "آفرین! جواب درست است." })

      setTimeout(async () => {
        setFeedback(null)
        setGuess("")

        // Check updated level and score
        const newLevel = await getPlayerLevel(account)
        const newScore = await getPlayerScore(account)

        setCurrentLevel(newLevel)
        setPlayerScore(newScore)

        if (newLevel >= levels.length) {
          setGameCompleted(true)
        }
      }, 1500)
    } catch (error: any) {
      console.error("Error submitting answer:", error)
      setFeedback({
        correct: false,
        message: "خطا در ارسال پاسخ: " + (error instanceof Error ? error.message : String(error)),
      })

      setTimeout(() => {
        setFeedback(null)
      }, 3000)
    } finally {
      setSubmitting(false)
      setProofGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg">در حال بارگذاری...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (gameCompleted) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">تبریک! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-xl">شما تمام مراحل بازی را با موفقیت به پایان رساندید!</p>
            <div className="py-4">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            </div>
            <div className="flex items-center justify-center gap-2 py-4">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <p className="text-xl font-bold">امتیاز شما: {formatScore(playerScore)}</p>
            </div>
            <p>به زودی مراحل جدیدی به بازی اضافه خواهد شد.</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => window.location.reload()}>
              شروع مجدد بازی
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const level = levels[currentLevel]

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">
              مرحله {currentLevel + 1} از {levels.length}
            </CardTitle>
            <div className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-bold">{formatScore(playerScore)}</span>
            </div>
          </div>
          <CardDescription>حدس بزنید این چیست؟</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg overflow-hidden border border-border">
            <img src={level.image || "/placeholder.svg"} alt="تصویر مرحله" className="w-full h-48 object-cover" />
          </div>

          <p className="text-base leading-relaxed">{level.description}</p>

          {feedback && (
            <Alert className={feedback.correct ? "bg-green-500/20" : "bg-red-500/20"}>
              <div className="flex items-center gap-2">
                {feedback.correct ? (
                  proofGenerating || submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-green-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <AlertDescription>{feedback.message}</AlertDescription>
              </div>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="pt-2">
            <div className="flex gap-2">
              <Input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="پاسخ خود را وارد کنید..."
                className="flex-1"
                required
                disabled={submitting || proofGenerating}
              />
              <Button type="submit" disabled={submitting || proofGenerating}>
                {submitting || proofGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

