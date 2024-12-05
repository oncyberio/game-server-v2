import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

import {
	getBoundingCurveSwapTransaction,
	getCompleteBoundingCurveSwapTransaction,
	getDelegateWallet,
	pumpfunSDK,
} from "./utils";

// handler
export async function buy(
	{
		delegate,
		mintAddress,
		amount,
		slippage,
		priorityFee,
		userAddress,
	}: {
		delegate: boolean;
		mintAddress: string;
		amount: number;
		slippage: number;
		priorityFee: number;
		userAddress: string;
	} = {
		amount: 0.001,
		delegate: false,
		slippage: 25,
		priorityFee: 1000000,
		userAddress: "",
		mintAddress: "",
	}
) {
	//
	try {
		// if (delegate) {
		// 	userAddress = await getDelegateWallet({
		// 		privyId: privyUserId,
		// 	});
		// }

		const amount_lamports = amount * LAMPORTS_PER_SOL;

		const bc = await pumpfunSDK.getBondingCurveAccount(
			new PublicKey(mintAddress)
		);

		if (bc.complete) {
			return await getCompleteBoundingCurveSwapTransaction({
				from: "So11111111111111111111111111111111111111112",
				to: mintAddress,
				userAddress,
				amount: amount_lamports,
				slippage,
				// priorityFee,
				delegate,
			});
		}

		const buyAmount = bc.getBuyPrice(BigInt(amount * LAMPORTS_PER_SOL));

		const maxAmountLamports = Math.floor(
			amount_lamports * (1 + slippage / 100)
		);

		return await getBoundingCurveSwapTransaction({
			priorityFee,
			mintAddress,
			userAddress,
			amount: buyAmount,
			maxAmountLamports,
			delegate,
		});
	} catch (error) {
		console.error(error);
		return { error: error.message, success: false };
	}
}
