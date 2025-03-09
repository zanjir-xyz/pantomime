import { ethers } from "ethers"
import * as snarkjs from "snarkjs"

// Contract address
export const CONTRACT_ADDRESS = "0xCd36bFD6f5c9685A5b1DD953E8279eeC7d41e1E1"

// ABI for the game contract
export const CONTRACT_ABI = [
  "function signup() external payable",
  "function submit(uint256 _ansHash, uint256 _ansNonce, uint256[2] calldata _pA, uint256[2][2] calldata _pB, uint256[2] calldata _pC) external",
  "function playerProgress(address player) external view returns (uint256)",
  "function isPlayer(address player) external view returns (bool)",
  "function playerScore(address player) external view returns (uint256)",
]

// Path to the circuit files
const WASM_FILE_URL = "/hide_circuit.wasm"
const ZKEY_FILE_URL = "/hide_circuit_final.zkey"

// Get contract instance
export async function getContract() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed")
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
}

// Generate a random nonce
function generateNonce(): bigint {
  // Generate a random 32-byte value
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  return ethers.toBigInt(ethers.hexlify(randomBytes))
}

// Generate proof using snarkjs
export async function generateProof(answer: string, level: number, account: string) {
  try {
    // Convert answer to a field element (using keccak hash)
    const answerHash = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes(answer)))

    // Generate a random nonce
    const nonce = generateNonce()

    // Prepare inputs for the circuit
    const input = {
      _msgSender: BigInt(account), // Convert address to BigInt
      answer: answerHash,
      nonce: nonce,
    }

    // Generate the proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_FILE_URL, ZKEY_FILE_URL)

    // Format the proof for the contract
    const proofFormatted = {
      answerHash: publicSignals[0], // The hash output from the circuit
      answerNonce: nonce.toString(),
      pA: [proof.pi_a[0], proof.pi_a[1]],
      pB: [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // Note: pB is reversed in snarkjs output
        [proof.pi_b[1][1], proof.pi_b[1][0]],
      ],
      pC: [proof.pi_c[0], proof.pi_c[1]],
      // For UI verification, we still need to check if the answer is correct
      address: ethers.computeAddress(ethers.keccak256(ethers.toUtf8Bytes(answer)).substring(2)),
    }

    return proofFormatted
  } catch (error) {
    console.error("Error generating proof:", error)
    throw new Error("Failed to generate zero-knowledge proof")
  }
}

// Get player's current level
export async function getPlayerLevel(address: string) {
  const contract = await getContract()
  const level = await contract.playerProgress(address)
  return Number(level)
}

// Check if address is a player
export async function isPlayer(address: string) {
  const contract = await getContract()
  return await contract.isPlayer(address)
}

// Get player's score - returns a string
export async function getPlayerScore(address: string) {
  const contract = await getContract()
  const score = await contract.playerScore(address)
  return score.toString() // Convert BigInt to string
}

