const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { http, type Hex, createWalletClient, parseEther, toBytes } from "viem";
import axios  from "axios";
import { privateKeyToAccount } from "viem/accounts";
import {
  DEFAULT_ENTRYPOINT_ADDRESS,
  type SupportedSigner,
  UserOperationStruct,
  createSmartAccountClient,
  getUserOpHash
} from "@biconomy/account";
import { sepolia } from "viem/chains";

const nativeTransfer = async (to: string, amount: number) => {
  console.log('User operation transaction started');
  const privateKey = `0x${process.env.RELAYER_1_PRIVATE_KEY}`;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const bundlerUrl = process.env.SEPOLIA_BUNDLER_URL;
  const chain = sepolia;

  // ----- 1. Generate EOA from private key
  const account = privateKeyToAccount(privateKey as Hex);

  const client = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  })

  const eoa = client.account.address;

  console.log(`EOA address: ${eoa}`);

  // ------ 2. Create biconomy smart account instance
  const smartAccount = await createSmartAccountClient({
    signer: client as SupportedSigner,
    bundlerUrl: bundlerUrl as string,
    biconomyPaymasterApiKey: process.env.SEPOLIA_PAYMASTER_API_KEY as string
  })

  const scwAddress = await smartAccount.getAccountAddress()
  
  console.log("SCW Address", scwAddress)

  // ------ 3. Generate transaction data
  const transaction = {
    to,
    value: parseEther(amount.toString())
  }

  let partialUserOp = await smartAccount.buildUserOp([transaction]);
  partialUserOp = await smartAccount.estimateUserOpGas(partialUserOp);

  const userOpHash = getUserOpHash(partialUserOp, DEFAULT_ENTRYPOINT_ADDRESS, 11155111);

  const signature = await smartAccount.signMessage(toBytes(userOpHash));

  partialUserOp.signature = signature;

  sendUserOperation(partialUserOp as UserOperationStruct, userOpHash);

  // const { wait, waitForTxHash } = await smartAccount.sendSignedUserOp(partialUserOp as UserOperationStruct)

  // const receipt = await wait();
  // const status = await waitForTxHash();

  // console.log(receipt, status);
}

const sendUserOperation = async (userOperation: UserOperationStruct, userOpHash: string) => {
  const data = JSON.stringify({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "eth_sendUserOperation",
    "params": {
      userOperation: userOperation,
      userOpHash
    }
  });
  
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'http://localhost:3000/v1/api/11155111',
    headers: { 
      'Content-Type': 'application/json'
    },
    data : data
  };
  
  await axios.request(config);
}

(async () => {
  nativeTransfer("0x8035F2eCF6D11207aCc97dd292A20D8bc6849876", 0.000001);
})();
