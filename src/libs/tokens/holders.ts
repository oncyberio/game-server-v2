import { getAssociatedTokenAddressSync } from "@solana/spl-token";

import {
	Connection,
	Keypair,
	PublicKey,
	LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import { CONNECTION, CONNECTION_URL, pumpfunSDK } from "./utils";

export async function getHolders(mintAddress: string) {
	const boundingCurveAccount = await pumpfunSDK.getBondingCurveAccount(
		new PublicKey(mintAddress)
	);

	// Pagination logic
	let page = 1;
	// allOwners will store all the addresses that hold the token
	let allOwners = [];

	const response = await fetch(CONNECTION_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			method: "getTokenAccounts",
			id: "helius-test",
			params: {
				page: page,
				limit: 1000,
				displayOptions: {},
				//mint address for the token we are interested in
				mint: mintAddress,
			},
		}),
	});

	// Check if any error in the response
	if (!response.ok) {
		console.log(`Error: ${response.status}, ${response.statusText}`);
	}

	const data = await response.json();
	// Pagination logic.
	if (!data.result || data.result.token_accounts.length === 0) {
		console.log(`No more results. Total pages: ${page - 1}`);
	}

	console.log(`Processing results from page ${page}`);
	// Adding unique owners to a list of token owners.
	data.result.token_accounts.forEach((account) => {
		allOwners.push({
			address: account.owner,
			percentage:
				(Number(account.amount) /
					Number(boundingCurveAccount.tokenTotalSupply)) *
				100,
		});
	});

	return allOwners.sort((a, b) => b.percentage - a.percentage).slice(0, 10);
}
