import { ethers } from "ethers"

// Zanjir network configuration
export const ZANJIR_NETWORK = {
  chainId: "0x2F147",
  chainName: "Zanjir Network",
  nativeCurrency: {
    name: "USDT",
    symbol: "USDT",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.zanjir.xyz"],
  blockExplorerUrls: ["https://zanjir.xyz/explorer"],
}

// Check if the user is on the Zanjir network
export async function isOnZanjirNetwork(): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    return false
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const network = await provider.getNetwork()
    return network.chainId === BigInt(192839)
  } catch (error) {
    console.error("Error checking network:", error)
    return false
  }
}

// Switch to Zanjir network or add it if it doesn't exist
export async function switchToZanjirNetwork(): Promise<boolean> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed")
  }

  try {
    // Try to switch to the Zanjir network
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ZANJIR_NETWORK.chainId }],
    })
    return true
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the Zanjir network to MetaMask
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [ZANJIR_NETWORK],
        })
        return true
      } catch (addError) {
        console.error("Error adding network:", addError)
        return false
      }
    }
    console.error("Error switching network:", switchError)
    return false
  }
}

