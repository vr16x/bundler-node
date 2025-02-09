import { sepolia } from 'viem/chains';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, Hex, http, parseEther, toBytes, WalletClient } from 'viem';
import { BiconomySmartAccountV2, createSmartAccountClient, DEFAULT_ENTRYPOINT_ADDRESS, getUserOpHash, SupportedSigner, UserOperationStruct } from '@biconomy/account';
import { getRandomId, sendUserOperation, UserOperationRequestData } from '../scripts/send-user-op-utils'
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, '../.env') });

jest.setTimeout(300000); // 5 minutes timeout

describe('Bundler Node E2E Testing: ', () => {
  // User's credentials
  const privateKey: `0x${string}` = `0x${process.env.USER_PRIVATE_KEY}`;

  // Chain Configuration
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const bundlerUrl = process.env.SEPOLIA_BUNDLER_URL;
  const chain = sepolia;

  // Public client
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl)
  });

  // User's EOA wallet configurations
  const account = privateKeyToAccount(privateKey as Hex);
  console.log("EOA address: ", account.address);

  // Random User's EOA wallet configurations
  const randomUser = privateKeyToAccount(generatePrivateKey());
  console.log("Random User EOA address: ", randomUser.address);

  const amountToBeTransferred = 0.000001;

  let client: WalletClient | undefined;
  let smartAccount: BiconomySmartAccountV2 | undefined;

  beforeAll(async () => {
    // User's EOA wallet client configurations
    client = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    });
    // User's Smart Wallet configurations
    smartAccount = await createSmartAccountClient({
      signer: client as SupportedSigner,
      bundlerUrl: bundlerUrl as string,
      biconomyPaymasterApiKey: process.env.SEPOLIA_PAYMASTER_API_KEY as string
    });

    console.log("Smart account address: ", await smartAccount.getAccountAddress());
  });

  test("Sending a UserOp with invalid params should fail", async () => {
    const randomId = getRandomId(1, 100000);

    const userOperationRequestData: UserOperationRequestData = {
      jsonrpc: "2.0",
      id: randomId,
      method: "eth_sendUserOperationNotExists",
      params: "invalid_params"
    }

    const response = await sendUserOperation(userOperationRequestData, chain.id);
    
    expect(response.isSuccess).toEqual(false);
  });

  test("Sending a UserOp with invalid RPC method should fail", async () => {
    const randomId = getRandomId(1, 100000);

    const userOperationRequestData: UserOperationRequestData = {
      jsonrpc: "2.0",
      id: randomId,
      method: "eth_sendUserOperationNotExists",
      params: {}
    }

    const response = await sendUserOperation(userOperationRequestData, chain.id);
    
    expect(response.isSuccess).toEqual(false);
  });

  test("Sending an Unsigned UserOp should fail", async () => {
    const transaction = {
      to: randomUser.address,
      value: parseEther(amountToBeTransferred.toString())
    }

    let partialUserOp = await (smartAccount as BiconomySmartAccountV2).buildUserOp([transaction]);
    partialUserOp = await (smartAccount as BiconomySmartAccountV2).estimateUserOpGas(partialUserOp);

    const userOpHash = getUserOpHash(partialUserOp, DEFAULT_ENTRYPOINT_ADDRESS, chain.id);

    partialUserOp.signature = undefined;

    const randomId = getRandomId(1, 100000);

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
    
    expect(response.isSuccess).toEqual(false);
  });

  test('Sending a valid UserOperation should pass', async () => {
    const transaction = {
      to: randomUser.address,
      value: parseEther(amountToBeTransferred.toString())
    }

    let partialUserOp = await (smartAccount as BiconomySmartAccountV2).buildUserOp([transaction]);
    partialUserOp = await (smartAccount as BiconomySmartAccountV2).estimateUserOpGas(partialUserOp);

    const userOpHash = getUserOpHash(partialUserOp, DEFAULT_ENTRYPOINT_ADDRESS, chain.id);

    const signature = await (smartAccount as BiconomySmartAccountV2).signMessage(toBytes(userOpHash));

    partialUserOp.signature = signature;

    const randomId = getRandomId(1, 100000);

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

    expect(response.isSuccess).toEqual(true);

    const transactionHash = response?.result?.transactionHash;
    expect(transactionHash).toEqual(expect.any(String));

    const transactionReceiptStringifiedValue = response?.result?.transactionReceipt;


    if (transactionReceiptStringifiedValue) {
      expect(transactionReceiptStringifiedValue).toEqual(expect.any(String));

      const transactionReceipt = JSON.parse(transactionReceiptStringifiedValue);
      const transactionStatus = transactionReceipt?.status;

      expect(transactionStatus).toEqual('success');

      console.log("Transaction Hash: ", transactionHash);
      console.log("Transaction Receipt: ", transactionReceipt);
    } else {
      // Incase the bundler can't able to get the transaction receipt, the client can get it with the
      // help of transactionHash
      const transactionReceipt = await publicClient.waitForTransactionReceipt(transactionHash);
      const transactionStatus = transactionReceipt?.status;

      expect(transactionStatus).toEqual('success');

      console.log("Transaction Hash: ", transactionHash);
      console.log("Transaction Receipt: ", transactionReceipt);
    }
  });
});
