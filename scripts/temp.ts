import { http, type Hex, createWalletClient, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
  PaymasterMode,
  type SupportedSigner,
  createSmartAccountClient
} from "@biconomy/account"
import { sepolia } from "viem/chains"

export const nativeTransfer = async (to: string, amount: number) => {
  // ----- 1. Generate EOA from private key
  const account = privateKeyToAccount(process.env.BUNDLER_1_PRIVATE_KEY as Hex)
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  })

  const eoa = client.account.address;

  console.log(`EOA address: ${eoa}`);

  // ------ 2. Create biconomy smart account instance
  const smartAccount = await createSmartAccountClient({
    signer: client as SupportedSigner,
    bundlerUrl: process.env.SEPOLIA_BUNDLER_URL as string,
    biconomyPaymasterApiKey: process.env.SEPOLIA_PAYMASTER_API_KEY as string
  })

  const scwAddress = await smartAccount.getAccountAddress()
  
  console.log("SCW Address", scwAddress)

  // ------ 3. Generate transaction data
  const txData = {
    to,
    value: parseEther(amount.toString())
  }

  // ------ 4. Send user operation and get tx hash
  const { waitForTxHash } = await smartAccount.sendTransaction(txData, {
    paymasterServiceData: { mode: PaymasterMode.SPONSORED }
  })
  const { transactionHash } = await waitForTxHash()
  console.log("transactionHash", transactionHash)
}