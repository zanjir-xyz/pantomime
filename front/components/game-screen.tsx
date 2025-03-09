"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2, Trophy, ArrowLeft, AlertTriangle } from "lucide-react"
import { getContract, getPlayerLevel, getPlayerScore, generateProof, getBasePath } from "@/lib/contract"
import { ethers } from "ethers"
import { buildPoseidon } from "circomlibjs"
import { isOnZanjirNetwork, switchToZanjirNetwork } from "@/lib/network"

let poseidonFunction: any = null

// Initialize poseidon function
async function getPoseidon() {
  if (!poseidonFunction) {
    poseidonFunction = await buildPoseidon()
  }
  return poseidonFunction
}

async function hashWithPoseidon(value: bigint): Promise<bigint> {
  const poseidon = await getPoseidon()

  // Convert BigInt to array of field elements
  // For poseidon(1), we need an array with a single element
  const fieldElements = [value]

  // Hash with poseidon
  const hash = poseidon.F.toString(poseidon(fieldElements))

  // Convert the result back to BigInt
  return BigInt(hash)
}


// Game levels data
const levels = [
  {
    id: 0,
    image: `${getBasePath()}/puzzles/1.png`,
    description:
      "پول الکترونیک قبل تو سوتفاهم بود...",
    answers: [BigInt("15550035901867825710541656951200314063598852388185132939840318200714754619164")],
  },
  {
    id: 1,
    image: `${getBasePath()}/puzzles/2.jfif`,
    description:
      "یه شام خوشمزه در کنار خانواده!",
    answers: [BigInt("5924626643951076610629940800270980549161563150585144562003107333784484140617")],
  },
  {
    id: 2,
    image: `${getBasePath()}/puzzles/3.png`,
    description:
      "آشنا نیست؟",
    answers: [BigInt("4911758091106049681353147699396737221278495174835789226891504884361969322423")],
  },
  {
    id: 3,
    image: `${getBasePath()}/puzzles/4.jpg`,
    description:
      "۱۰ سال آزگار!",
    answers: [BigInt("14952116241901025868198225824644821548361362427729664035397754967049736284216")],
  },
  {
    id: 4,
    image: `${getBasePath()}/puzzles/5.png`,
    description:
      "آقای ایکس: هفته اخیر چیکار کردی؟!",
    answers: [BigInt("13815503951463074870886003402986531327254418967647028953586288711208001443998")],
  },
  {
    id: 5,
    image: `${getBasePath()}/puzzles/6.png`,
    description:
      "بیا همه‌چیو بهم بریزیم! (اتریوم استایل)",
    answers: [BigInt("14139398369174395826259565753474814794485667017906063276909736281556794560761")],
  },
  {
    id: 6,
    image: `${getBasePath()}/puzzles/7.jpg`,
    description:
      "هرچی اتریوم بود رو برد به محل تولدش.",
    answers: [BigInt("17982783151064802464006952155749096732028525189102851605039262417383779012028")],
  }
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
  const [networkError, setNetworkError] = useState(false)
  const [switchingNetwork, setSwitchingNetwork] = useState(false)
  const [walletDisconnected, setWalletDisconnected] = useState(false)

  // Fetch player's current level and score on component mount
  useEffect(() => {
    async function checkNetworkAndFetchData() {
      try {
        if (typeof window.ethereum === "undefined") {
          setLoading(false)
          return
        }

        // First check if on correct network
        const correctNetwork = await isOnZanjirNetwork()
        if (!correctNetwork) {
          setNetworkError(true)
          setLoading(false)
          return
        }

        // Check if account is still connected
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_accounts", [])

        if (accounts.length === 0) {
          // Wallet is disconnected
          setWalletDisconnected(true)
          setLoading(false)
          return
        }

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

    checkNetworkAndFetchData()

    // Listen for network changes
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("chainChanged", () => {
        window.location.reload()
      })

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setWalletDisconnected(true)
        } else if (accounts[0] !== account) {
          // User switched accounts, reload to check new account status
          window.location.reload()
        }
      })
    }

    return () => {
      // Clean up listeners
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeListener("chainChanged", () => { })
        window.ethereum.removeListener("accountsChanged", () => { })
      }
    }
  }, [account])

  async function handleSwitchNetwork() {
    try {
      setSwitchingNetwork(true)
      const success = await switchToZanjirNetwork()
      if (success) {
        setNetworkError(false)
        // Reload the page to ensure everything is fresh
        window.location.reload()
      }
    } catch (error) {
      console.error("Error switching network:", error)
    } finally {
      setSwitchingNetwork(false)
    }
  }

  async function reconnectWallet() {
    try {
      setLoading(true)

      // First check if on correct network
      const correctNetwork = await isOnZanjirNetwork()
      if (!correctNetwork) {
        setNetworkError(true)
        setLoading(false)
        return
      }

      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_requestAccounts", [])

        if (accounts.length > 0) {
          // Reload the page to refresh all data with the new account
          window.location.reload()
        }
      } else {
        alert("لطفا MetaMask را نصب کنید")
      }
    } catch (error) {
      console.error("خطا در اتصال مجدد کیف پول:", error)
    } finally {
      setLoading(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (submitting || proofGenerating) return

    try {
      // Check if on correct network before submitting
      const correctNetwork = await isOnZanjirNetwork()
      if (!correctNetwork) {
        setNetworkError(true)
        return
      }

      setProofGenerating(true)
      const level = levels[currentLevel]
      const normalizedGuess = guess.trim()

      // Check if the answer is potentially correct (for UI feedback)
      const answer = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes(normalizedGuess))) % BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
      const answerHash = await hashWithPoseidon(answer);
      const isCorrect = level.answers.includes(answerHash)

      if (!isCorrect) {
        // If the answer is definitely wrong, don't bother generating a proof
        setFeedback({ correct: false, message: "متأسفانه پاسخ اشتباه است. دوباره تلاش کنید." })

        setTimeout(() => {
          setFeedback(null)
        }, 3000)

        setProofGenerating(false)
        return
      }

      // Generate proof for the answer
      setFeedback({ correct: true, message: "در حال تولید اثبات..." })
      const proof = await generateProof(answer, account)
      setProofGenerating(false)

      // Now submit the proof to the contract
      setSubmitting(true)
      setFeedback({ correct: true, message: "در حال ارسال پاسخ..." })

      // Submit to contract with snarkjs proof
      const contract = await getContract()

      // Call the submit function with the proof
      const tx = await contract.submit(proof.answerHash, proof.pA, proof.pB, proof.pC)

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
      }, 3000)
    } catch (error: any) {
      console.error("Error submitting answer:", error)
      setFeedback({
        correct: false,
        message: "خطا در ارسال پاسخ!",
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



  if (networkError) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">شبکه نادرست</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>لطفا به شبکه زنجیر متصل شوید تا بتوانید بازی کنید.</AlertDescription>
            </Alert>

            <div className="p-4 bg-secondary rounded-lg space-y-2">
              <p className="font-semibold">مشخصات شبکه:</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="text-muted-foreground">نام شبکه:</span>
                <span className="col-span-2 font-mono text-left">Zanjir Network</span>

                <span className="text-muted-foreground">آدرس RPC:</span>
                <span className="col-span-2 font-mono break-all text-left">https://rpc.zanjir.xyz</span>

                <span className="text-muted-foreground">شناسه شبکه:</span>
                <span className="col-span-2 font-mono text-left">192837</span>

                <span className="text-muted-foreground">نماد ارز:</span>
                <span className="col-span-2 font-mono text-left">ETH</span>

                <span className="text-muted-foreground">کاوشگر بلوک:</span>
                <span className="col-span-2 font-mono break-all text-left">https://zanjir.xyz/explorer</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleSwitchNetwork} disabled={switchingNetwork}>
              {switchingNetwork ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  در حال تغییر شبکه...
                </>
              ) : (
                "تغییر به شبکه زنجیر"
              )}
            </Button>
          </CardFooter>
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
        </Card>
      </div>
    )
  }

  // Add the wallet disconnected UI
  if (walletDisconnected) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">کیف پول قطع شده است</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>اتصال کیف پول شما قطع شده است. لطفا دوباره متصل شوید.</AlertDescription>
            </Alert>

            <p className="text-center py-2">برای ادامه بازی، لازم است کیف پول خود را دوباره به برنامه متصل کنید.</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={reconnectWallet} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  در حال اتصال...
                </>
              ) : (
                "اتصال مجدد کیف پول"
              )}
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
              مرحله {(currentLevel + 1).toLocaleString("fa")} از {levels.length.toLocaleString("fa")}
            </CardTitle>
            <div className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-bold">{formatScore(playerScore)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg overflow-hidden border border-border">
            <img src={level.image || "/placeholder.svg"} alt="تصویر مرحله" className="w-full object-cover" />
          </div>

          <p className="text-base leading-relaxed text-center">{level.description}</p>

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
            <div className="flex gap-1">
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
                  <ArrowLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

