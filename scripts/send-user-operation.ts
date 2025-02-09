import { http, type Hex, createWalletClient, parseEther, toBytes } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  DEFAULT_ENTRYPOINT_ADDRESS,
  type SupportedSigner,
  UserOperationStruct,
  createSmartAccountClient,
  getUserOpHash
} from "@biconomy/account";
import { sepolia } from "viem/chains";
import { getRandomId, sendUserOperation, UserOperationRequestData } from "./send-user-op-utils";
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const nativeTransfer = async (to: string, amount: number) => {
  // User's credentials
  const privateKey: `0x${string}` = `0x${process.env.USER_PRIVATE_KEY}`;

  // Chain Configuration
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const bundlerUrl = process.env.SEPOLIA_BUNDLER_URL;
  const chain = sepolia;

  // User's EOA wallet configurations
  const account = privateKeyToAccount(privateKey as Hex);
  console.log("EOA address: ", account.address);

  // User's EOA wallet client configurations
  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });

  // User's Smart Wallet configurations
  const smartAccount = await createSmartAccountClient({
    signer: client as SupportedSigner,
    bundlerUrl: bundlerUrl as string,
    biconomyPaymasterApiKey: process.env.SEPOLIA_PAYMASTER_API_KEY as string
  });

  console.log("Smart account address: ", await smartAccount.getAccountAddress());

  // Transaction call data
  const transaction = {
    to,
    value: parseEther(amount.toString())
  }

  let partialUserOp = await smartAccount.buildUserOp([transaction]);

  // Esitmating gas with existing Biconomy bundler RPC
  partialUserOp = await smartAccount.estimateUserOpGas(partialUserOp);

  const userOpHash = getUserOpHash(partialUserOp, DEFAULT_ENTRYPOINT_ADDRESS, chain.id);

  const signature = await smartAccount.signMessage(toBytes(userOpHash));

  partialUserOp.signature = signature;

  const randomId = getRandomId(1, 100000);

  // User operation RPC request object
  const userOperationRequestData: UserOperationRequestData = {
    jsonrpc: "2.0",
    id: randomId,
    method: "eth_sendUserOperation",
    params: {
      userOperation: partialUserOp as UserOperationStruct,
      userOpHash
    }
  }

  const response = await sendUserOperation(userOperationRequestData, chain.id);

  if (response.isSuccess) {
    console.log('\n\n============================================================\n\n');
    console.log("Transaction hash: ", response.result.transactionHash);
    console.log('\n\n============================================================\n\n');
    // Sometimes the bundler failed to get the transaction receipt within the given time. In this case,
    // the client can fetch the transaction receipt with the help of transaction hash
    console.log("Transaction receipt: ", response?.result?.transactionReceipt
      ? JSON.parse(response.result.transactionReceipt) : response.result.transactionReceipt);
    console.log('\n\n============================================================\n\n');
  } else {
    console.log('\n\n============================================================\n\n');
    console.log("Error: ", response.error.message);
    console.log('\n\n============================================================\n\n');
  }

}

(async () => {
  // Random User's EOA wallet configurations
  const randomUser = privateKeyToAccount(generatePrivateKey());
  console.log("Random User EOA address: ", randomUser.address);

  await nativeTransfer(randomUser.address, 0.000001);
})();
