"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ethers } from "ethers"
import GameScreen from "@/components/game-screen"
import { getContract, isPlayer } from "@/lib/contract"

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [signedUp, setSignedUp] = useState(false)
  const [account, setAccount] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if user is already signed up
  useEffect(() => {
    async function checkPlayerStatus() {
      try {
        if (typeof window.ethereum !== "undefined") {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const accounts = await provider.send("eth_requestAccounts", [])
          if (accounts.length > 0) {
            const playerAddress = accounts[0]
            setAccount(playerAddress)
            setWalletConnected(true)

            // Check if already a player
            const playerStatus = await isPlayer(playerAddress)
            setSignedUp(playerStatus)
          }
        }
      } catch (error) {
        console.error("Error checking player status:", error)
      } finally {
        setCheckingStatus(false)
      }
    }

    checkPlayerStatus()
  }, [])

  async function connectWallet() {
    try {
      setLoading(true)
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_requestAccounts", [])
        setAccount(accounts[0])
        setWalletConnected(true)

        // Check if already a player
        const playerStatus = await isPlayer(accounts[0])
        setSignedUp(playerStatus)
      } else {
        alert("لطفا MetaMask را نصب کنید")
      }
    } catch (error) {
      console.error("خطا در اتصال به کیف پول:", error)
    } finally {
      setLoading(false)
    }
  }

  async function signUp() {
    try {
      setLoading(true)
      if (typeof window.ethereum !== "undefined") {
        const contract = await getContract()

        // Call the signup function with 0.001 ETH
        const tx = await contract.signup({
          value: ethers.parseEther("0.001"),
        })

        await tx.wait()
        setSignedUp(true)
      }
    } catch (error) {
      console.error("خطا در ثبت نام:", error)
      alert("خطا در ثبت نام: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="container flex items-center justify-center min-h-screen py-8">
        <Card className="w-full max-w-md border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <p className="mt-4 text-lg">در حال بررسی وضعیت...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (signedUp) {
    return <GameScreen account={account} />
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">پانتومیم</CardTitle>
          <CardDescription className="text-lg mt-2">بازی حدس زدن با وب۳</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center mb-6">
            به بازی پانتومیم خوش آمدید! در این بازی، تصاویر و توضیحاتی به شما نشان داده می‌شود و شما باید حدس بزنید که چه
            چیزی توصیف شده است. برای شروع بازی، ابتدا کیف پول خود را متصل کنید و سپس مبلغ ۰.۰۰۱ اتر را برای ثبت نام
            پرداخت کنید.
          </p>

          {walletConnected ? (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg text-center">
                <p className="text-sm text-muted-foreground">آدرس کیف پول شما:</p>
                <p className="font-mono text-xs break-all">{account}</p>
              </div>
              <Button className="w-full" onClick={signUp} disabled={loading}>
                {loading ? "در حال پردازش..." : "ثبت نام (پرداخت ۰.۰۰۱ اتر)"}
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={connectWallet} disabled={loading}>
              {loading ? "در حال اتصال..." : "اتصال کیف پول"}
            </Button>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          <p className="w-full">برای بازی کردن به MetaMask و مقداری اتر نیاز دارید.</p>
        </CardFooter>
      </Card>
    </div>
  )
}

