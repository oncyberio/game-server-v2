import { PublicKey } from "@solana/web3.js";

import {
	getBoundingCurveSwapTransaction,
	getCompleteBoundingCurveSwapTransaction,
	getDelegateWallet,
	pumpfunSDK,
} from "./utils";

export async function sell(
	{
		mintAddress,
		userAddress,
		amount,
		slippage,
		priorityFee,
		delegate,
	}: {
		mintAddress: string;
		userAddress: string;
		amount: number;
		slippage: number;
		priorityFee: number;
		delegate: boolean;
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
	//
	try {
		// if (delegate) {
		// 	userAddress = await getDelegateWallet({
		// 		privyId: privyUserId,
		// 	});
		// }

		const bc = await pumpfunSDK.getBondingCurveAccount(
			new PublicKey(mintAddress)
		);

		if (bc.complete) {
			return await getCompleteBoundingCurveSwapTransaction({
				from: mintAddress,
				to: "So11111111111111111111111111111111111111112",
				userAddress,
				amount: amount * 10 ** 6,
				slippage,
				// priorityFee,
				delegate,
			});
		}

		let globalAccount = await pumpfunSDK.getGlobalAccount("confirmed");

		const minSolOutput = bc.getSellPrice(
			BigInt(amount * 10 ** 6),
			globalAccount.feeBasisPoints
		);

		let sellAmountWithSlippage =
			Number(minSolOutput) - Number(minSolOutput) * (slippage / 100);

		return await getBoundingCurveSwapTransaction({
			priorityFee,
			mintAddress,
			userAddress,
			amount: amount * 10 ** 6,
			maxAmountLamports: BigInt(Math.floor(sellAmountWithSlippage)),
			delegate,
			type: "sell",
		});
	} catch (error) {
		console.error(error);
		return { error: error.message, success: false };
	}
}
