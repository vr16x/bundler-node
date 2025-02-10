import { http, type Hex, createWalletClient, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  UserOperationStruct,
  createSmartAccountClient,
} from "@biconomy/account";
import { sepolia } from "viem/chains";
import { getRandomId, sendUserOperation, UserOperationRequestData } from "./send-user-op-utils";
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const nativeTransfer = async (userPrivateKey: string, to: string, amount: number) => {
  // Chain Configuration
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const bundlerUrl = process.env.SEPOLIA_BUNDLER_URL;
  const chain = sepolia;

  // User's EOA wallet configurations
  const account = privateKeyToAccount(userPrivateKey as Hex);
  console.log("EOA address: ", account.address);

  // User's EOA wallet client configurations
  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });

  // User's Smart Wallet configurations
  const smartAccount = await createSmartAccountClient({
    signer: client,
    bundlerUrl: bundlerUrl as string
  });

  console.log("Smart account address: ", await smartAccount.getAccountAddress());

  // Transaction call data
  const transaction = {
    to,
    value: parseEther(amount.toString())
  }

  const partialUserOp = await smartAccount.buildUserOp([transaction]);
  const userOpHash = await smartAccount.getUserOpHash(partialUserOp);
  const signedUserOp = await smartAccount.signUserOp(partialUserOp);

  const randomId = getRandomId(1, 100000);

  // User operation RPC request object
  const userOperationRequestData: UserOperationRequestData = {
    jsonrpc: "2.0",
    id: randomId,
    method: "eth_sendUserOperation",
    params: {
      userOperation: signedUserOp as UserOperationStruct,
      userOpHash
    }
  }

  const response = await sendUserOperation(userOperationRequestData, chain.id);

  if (response.isSuccess) {
    console.log('\n\n============================================================\n\n');
    console.log("Transaction link: ", response.result.explorerLink);
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

  // User's 1 credentials
  const privateKeyUserOne: `0x${string}` = `0x${process.env.USER_1_PRIVATE_KEY}`;

  // User's 2 credentials
  const privateKeyUserTwo: `0x${string}` = `0x${process.env.USER_2_PRIVATE_KEY}`;

  // User's 3 credentials
  const privateKeyUserThree: `0x${string}` = `0x${process.env.USER_3_PRIVATE_KEY}`;

  await Promise.all([
    nativeTransfer(privateKeyUserOne, randomUser.address, 0.000001),
    nativeTransfer(privateKeyUserTwo, randomUser.address, 0.000001),
    nativeTransfer(privateKeyUserThree, randomUser.address, 0.000001)
  ]);
})();
