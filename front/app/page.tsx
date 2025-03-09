"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ethers } from "ethers"
import GameScreen from "@/components/game-screen"
import { getContract, isPlayer } from "@/lib/contract"
import { isOnZanjirNetwork, switchToZanjirNetwork } from "@/lib/network"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, AlertTriangle, Drama, Loader2 } from "lucide-react"
import { formatBalance, getBalance, hasEnoughBalance } from "@/lib/wallet"

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [signedUp, setSignedUp] = useState(false)
  const [account, setAccount] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const [switchingNetwork, setSwitchingNetwork] = useState(false)
  const [hasBalance, setHasBalance] = useState(false)
  const [userBalance, setUserBalance] = useState<bigint>(BigInt(0))
  const [checkingBalance, setCheckingBalance] = useState(false)

  // Check network and player status
  useEffect(() => {
    async function checkStatus() {
      try {
        // First check if MetaMask is installed
        if (typeof window.ethereum === "undefined") {
          setCheckingStatus(false)
          return
        }

        // Check if user is on the correct network
        const correctNetwork = await isOnZanjirNetwork()
        if (!correctNetwork) {
          setNetworkError(true)
          setCheckingStatus(false)
          return
        }

        // If on correct network, check if wallet is connected
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_accounts", [])

        if (accounts.length > 0) {
          const playerAddress = accounts[0]
          setAccount(playerAddress)
          setWalletConnected(true)

          // Check if already a player
          const playerStatus = await isPlayer(playerAddress)
          setSignedUp(playerStatus)

          if (!playerStatus) {
            await checkUserBalance(playerAddress)
          }
        } else {
          // No accounts connected
          setWalletConnected(false)
          setAccount("")
          setSignedUp(false)
        }
      } catch (error) {
        console.error("Error checking status:", error)
      } finally {
        setCheckingStatus(false)
      }
    }

    checkStatus()

    // Listen for network changes
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("chainChanged", () => {
        window.location.reload()
      })

      // Listen for account changes or disconnection
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          setWalletConnected(false)
          setAccount("")
          setSignedUp(false)
          setHasBalance(false)
          setUserBalance(BigInt(0))
        } else {
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
  }, [])

  // Check user balance
  async function checkUserBalance(address: string) {
    try {
      setCheckingBalance(true)

      // Get user's balance
      const balance = await getBalance(address)
      setUserBalance(balance)

      // Check if user has enough balance for signup
      const enoughBalance = await hasEnoughBalance(address)
      setHasBalance(enoughBalance)
    } catch (error) {
      console.error("Error checking balance:", error)
    } finally {
      setCheckingBalance(false)
    }
  }

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

  async function connectWallet() {
    try {
      setLoading(true)

      // First check if on correct network
      const correctNetwork = await isOnZanjirNetwork()
      if (!correctNetwork) {
        setNetworkError(true)
        return
      }

      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_requestAccounts", [])
        const playerAddress = accounts[0]
        setAccount(playerAddress)
        setWalletConnected(true)

        // Check if already a player
        const playerStatus = await isPlayer(playerAddress)
        setSignedUp(playerStatus)

        // Check balance if not already signed up
        if (!playerStatus) {
          await checkUserBalance(playerAddress)
        }
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

      // Check if on correct network before signing up
      const correctNetwork = await isOnZanjirNetwork()
      if (!correctNetwork) {
        setNetworkError(true)
        return
      }

      // Check balance again before signing up
      const enoughBalance = await hasEnoughBalance(account)
      if (!enoughBalance) {
        setHasBalance(false)
        return
      }

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
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg">در حال بررسی وضعیت...</p>
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

                <span className="text-muted-foreground">کاوشگر بلاک:</span>
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

  if (signedUp) {
    return <GameScreen account={account} />
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex justify-center items-center">پانتومیم <Drama className="mr-2"></Drama></CardTitle>
          <CardDescription className="text-lg mt-2">بازی حدس کلمه بر بستر زنجیر</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletConnected ? (
            <div className="space-y-4 text-center mb-6">
              <p>قبل از شروع بازی باید با پرداخت یک مبلغ اولیه ثبت‌نام کنید!</p>
              <p className="font-bold text-destructive">
              توجه: این فقط یک بازی آزمایشی در شبکه تستی زنجیر است و وجوه واقعی نیستند!
            </p>
            </div>
          ) : (<div className="space-y-4 text-center mb-6">
            <p>به بازی پانتومیم خوش آمدید! این یک بازی ساده برای نمایش قابلیت‌های قراردادهای هوشمند است.</p>
            <p>
              بازی شامل معماهایی است که در آن‌ها تصویر و توضیحاتی نمایش داده می‌شود و شما باید کلمه مورد نظر را حدس بزنید.
              پاسخ‌ها از طریق اثبات‌های دانش صفر (zero-knowledge proofs) پنهان شده‌اند، بنابراین علی‌رغم اینکه شما آن‌ها را
              به صورت عمومی ارسال می‌کنید، هیچ‌کس نمی‌تواند پاسخ را ببیند، اما همه می‌توانند متقاعد شوند که شما پاسخ را پیدا
              کرده‌اید.
            </p>
            <p>
              بازی بر اساس سرعت پیدا کردن پاسخ‌ها به کاربران امتیاز می‌دهد. پس از پایان بازی، وجوه جمع‌آوری شده در قرارداد
              به نسبت امتیازات کاربران توزیع می‌شود.
            </p>
            <p className="font-bold text-destructive">
              توجه: این فقط یک بازی آزمایشی در شبکه تستی زنجیر است و وجوه واقعی نیستند!
            </p>
          </div>)}

          {walletConnected ? (
            <div className="space-y-4">
              <div className="p-3 bg-secondary rounded-lg text-center">
                <p className="text-sm text-muted-foreground">آدرس کیف پول شما:</p>
                <p className="font-mono text-xs break-all">{account}</p>
                {!checkingBalance && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">موجودی شما:</p>
                    <p className="font-mono" dir="ltr">{formatBalance(userBalance)} ETH</p>
                  </div>
                )}
              </div>

              {!hasBalance && !checkingBalance && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>موجودی شما کافی نیست. برای ثبت نام حداقل به ۰.۰۰۱ اتر نیاز دارید.</AlertDescription>
                </Alert>
              )}

              <Button className="w-full" onClick={signUp} disabled={loading || !hasBalance || checkingBalance}>
                {loading
                  ? "در حال پردازش..."
                  : checkingBalance
                    ? "در حال بررسی موجودی..."
                    : "ثبت نام (پرداخت ۰.۰۰۱ اتر)"}
              </Button>

              {!hasBalance && !checkingBalance && (
                <p className="text-sm text-center text-muted-foreground">
                  لطفا مقداری اتر به کیف پول خود در شبکه زنجیر واریز کنید و سپس دکمه ثبت نام را بزنید.
                </p>
              )}

            </div>
          ) : (
            <Button className="w-full" onClick={connectWallet} disabled={loading}>
              {loading ? "در حال اتصال..." : "اتصال کیف پول"}
            </Button>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          <p className="w-full">برای بازی کردن به افزونه متامسک و مقداری اتریوم نیاز دارید.</p>
        </CardFooter>
      </Card>
    </div>
  )
}

