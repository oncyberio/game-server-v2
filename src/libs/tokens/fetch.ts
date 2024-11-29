import {
	Connection,
	Keypair,
	PublicKey,
	LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import { CONNECTION, pumpfunSDK } from "./utils";

import { Metaplex } from "@metaplex-foundation/js";
import {
	CompleteEvent,
	CreateEvent,
	PumpFunEventHandlers,
	PumpFunEventType,
	SetParamsEvent,
	TradeEvent,
} from "pumpdotfun-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { balanceChecker } from "./balance";
import { priceChecker } from "./price";
import { marketcapChecker } from "./marketcap";

// handler
export async function fetchMetadata({ mintAddress }) {
	//
	//
	try {
		const metaplex = Metaplex.make(CONNECTION);

		let tokenMetadata = await metaplex
			.nfts()
			.findByMint({ mintAddress: new PublicKey(mintAddress) });

		try {
			const uriRequest = await fetch(tokenMetadata.uri);

			const uriResponse = await uriRequest.json();

			tokenMetadata = {
				...tokenMetadata,
				...uriResponse,
			};
		} catch (err) {
			console.log(err);
		}

		return { success: true, metadata: tokenMetadata };
	} catch (error) {
		console.error(error);
		return { error: error.message, success: false };
	}
}

export function addEventListener(
	eventName: keyof PumpFunEventHandlers | "price" | "balance" | "marketcap",
	callback: (
		event:
			| CreateEvent
			| TradeEvent
			| CompleteEvent
			| SetParamsEvent
			| {
					price: number;
			  }
			| {
					balance: number | null;
					mint: string | null;
			  }
			| {
					marketcap: number;
			  },
		slot: number | null,
		signature: string | null
	) => void,
	filters?: {
		mintAddress?: string;
		ownerAddress?: string;
	}
) {
	if (eventName === "price") {
		priceChecker.addEventListener(eventName, callback, filters);

		return;
	}

	if (eventName === "balance") {
		balanceChecker.addEventListener(eventName, callback, filters);

		return;
	}

	if (eventName === "marketcap") {
		marketcapChecker.addEventListener(eventName, callback, filters);
		return;
	}

	const interval = setInterval(() => {
		if (!pumpfunSDK?.program?.addEventListener) {
			return;
		}

		clearInterval(interval);

		pumpfunSDK.addEventListener(eventName, callback);
	}, 1000);
}
