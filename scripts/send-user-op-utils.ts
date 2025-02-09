import { UserOperationStruct } from "@biconomy/account";
import axios, { AxiosError } from "axios";

export interface UserOperationRequestData {
  jsonrpc: string;
  id: number;
  method: string,
  params: {
    userOperation?: UserOperationStruct
    userOpHash?: string
  } | unknown[] | any; // These any and unknown types are only used for testing invalid cases
}

export const getRandomId = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min) + min);
}

export const sendUserOperation = async (userOperationRequestData: UserOperationRequestData, chainId: number) => {
  try {
    const baseBundlerUrl = process.env.BASE_BUNDLER_URL;

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${baseBundlerUrl}/v1/api/${chainId}`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(userOperationRequestData)
    };

    const response = await axios.request(config);

    return {
      isSuccess: true,
      result: response.data.result
    };
  } catch (error) {
    const errorInfo = error as AxiosError;

    return {
      isSuccess: false,
      error: error?.response?.data?.error || { message: errorInfo.message }
    };
  }
}