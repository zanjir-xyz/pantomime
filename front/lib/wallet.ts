import { ethers } from "ethers"

// Check if user has enough balance for signup (0.001 ETH)
export async function hasEnoughBalance(address: string): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    return false
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const balance = await provider.getBalance(address)

    // Check if balance is at least 0.001 ETH
    const minimumBalance = ethers.parseEther("0.001")
    return balance >= minimumBalance
  } catch (error) {
    console.error("Error checking balance:", error)
    return false
  }
}

// Format ETH balance with 4 decimal places
export function formatBalance(balance: bigint): string {
  return ethers.formatEther(balance).substring(0, 6)
}

// Get user's ETH balance
export async function getBalance(address: string): Promise<bigint> {
  if (typeof window === "undefined" || !window.ethereum) {
    return BigInt(0)
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum)
    return await provider.getBalance(address)
  } catch (error) {
    console.error("Error getting balance:", error)
    return BigInt(0)
  }
}

