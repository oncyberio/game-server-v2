import {
	Connection,
	PublicKey,
	Transaction,
	ComputeBudgetProgram,
	VersionedTransaction,
} from "@solana/web3.js";

import { PrivyClient, WalletWithMetadata } from "@privy-io/server-auth";

import { AnchorProvider } from "@coral-xyz/anchor";

import { buildVersionedTx, PumpFunSDK } from "pumpdotfun-sdk";

export const CONNECTION_URL =
	"https://mainnet.helius-rpc.com/?api-key=8d991eed-5073-4a20-8d81-78e30b17241e";

export const CONNECTION = new Connection(CONNECTION_URL);

export const privyClient = new PrivyClient(
	process.env.NEXT_PUBLIC_PRIVY_APP_ID,
	process.env.PRIVY_SECRET_KEY,
	{
		walletApi: {
			authorizationPrivateKey:
				"wallet-api:MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgi5ZQEtaKgi5zlRMdK5p1Y5W2v/KJvR7EKuxXV8UI+TKhRANCAAQDg8MPpOutIrRM6EI4JEhZA0G82f37kt3/+olfyePDnrtDPqbog5ke9U36KqppRdRuqCR5toZOeMDvfA48kmAH",
		},
	}
);

const provider = new AnchorProvider(CONNECTION, null, {
	commitment: "finalized",
});

export const pumpfunSDK = new PumpFunSDK(provider);

export async function runDelegatedTransaction(userAddress, versionedTx) {
	const { data, method } = await privyClient.walletApi.rpc({
		address: userAddress,
		chainType: "solana",
		method: "signTransaction",
		params: {
			transaction: versionedTx,
		},
	});

	const serializedTransaction = data.signedTransaction.serialize();

	const signature = await CONNECTION.sendRawTransaction(
		serializedTransaction,
		{
			skipPreflight: false,
			preflightCommitment: "confirmed",
		}
	);

	return {
		signature,
	};
}

export async function getDelegateWallet({ privyId }) {
	const privyUserId = privyId;

	const user = await privyClient.getUser(`${privyUserId}`);

	const embeddedWallets = user.linkedAccounts.filter(
		(account): account is WalletWithMetadata =>
			account.type === "wallet" &&
			account.walletClientType === "privy" &&
			account.chainType === "solana"
	);

	const delegatedWallet = embeddedWallets.find((wallet) => wallet.delegated);

	return delegatedWallet.address;
}

export async function getQuote({ from, to, amount, slippage }) {
	const request = await fetch(
		`https://quote-api.jup.ag/v6/quote?inputMint=${from}&outputMint=${to}&amount=${amount}&slippageBps=${slippage}`
	);

	const quote = await request.json();

	if (quote.error) {
		return { error: quote.error, success: false };
	}

	return quote;
}

export async function getSwapTransaction({ userAddress, quote }) {
	const swapRequest = await fetch(`https://quote-api.jup.ag/v6/swap`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			userPublicKey: userAddress,
			quoteResponse: quote,
		}),
	});

	const swap = await swapRequest.json();

	if (swap.error) {
		return { error: swap.error, success: false };
	}

	return swap;
}

export async function getBoundingCurveSwapTransaction({
	priorityFee,
	mintAddress,
	userAddress,
	amount,
	maxAmountLamports,
	delegate,
	type = "buy", // buy or sell
}) {
	let tx = new Transaction();

	if (priorityFee) {
		const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
			units: priorityFee,
		});
		const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
			microLamports: priorityFee,
		});
		tx.add(modifyComputeUnits);
		tx.add(addPriorityFee);
	}

	if (type === "buy") {
		tx.add(
			await pumpfunSDK.getBuyInstructions(
				new PublicKey(userAddress),
				new PublicKey(mintAddress),
				new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"),
				BigInt(amount),
				BigInt(maxAmountLamports)
			)
		);
	} else {
		tx.add(
			await pumpfunSDK.getSellInstructions(
				new PublicKey(userAddress),
				new PublicKey(mintAddress),
				new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"),
				amount,
				maxAmountLamports
			)
		);
	}

	let versionedTx = await buildVersionedTx(
		CONNECTION,
		new PublicKey(userAddress),
		tx,
		"confirmed"
	);

	if (delegate) {
		const { signature } = await runDelegatedTransaction(
			userAddress,
			versionedTx
		);

		return {
			success: true,
			signature,
		};
	}

	return {
		success: true,
		tx: Buffer.from(versionedTx.serialize()).toString("base64"),
	};
}

export async function getCompleteBoundingCurveSwapTransaction({
	from,
	to,
	userAddress,
	amount,
	slippage,
	delegate,
}) {
	const quote = await getQuote({
		to,
		from,
		amount,
		slippage,
	});

	if (quote.error) {
		return quote;
	}

	const swap = await getSwapTransaction({
		userAddress,
		quote,
	});

	if (swap.error) {
		return swap;
	}

	if (delegate) {
		const data = Uint8Array.from(
			Buffer.from(swap.swapTransaction, "base64")
		);

		const versionedTx = VersionedTransaction.deserialize(data);

		const { signature } = await runDelegatedTransaction(
			userAddress,
			versionedTx
		);

		return {
			success: true,
			signature,
		};
	}

	return {
		success: true,
		complete: true,
		tx: swap.swapTransaction,
	};
}
