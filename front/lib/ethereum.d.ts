interface Window {
  ethereum?: {
    isMetaMask?: boolean
    request: (request: { method: string; params?: Array<any> }) => Promise<any>
  }
}

