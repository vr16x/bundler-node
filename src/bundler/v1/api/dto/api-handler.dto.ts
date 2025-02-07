import { IsNotEmpty, IsNumber, IsObject, IsString, Matches, Min, Validate } from "class-validator";
import { RPC_METHODS_TYPE } from "../api.service";

export class ApiHandlerDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/2.0/, { message: "Invalid JSON RPC version" })
    jsonrpc: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    id: string;

    @IsString()
    @IsNotEmpty()
    method: RPC_METHODS_TYPE;

    @IsNotEmpty()
    params: Record<string, string> | Array<string>;
}