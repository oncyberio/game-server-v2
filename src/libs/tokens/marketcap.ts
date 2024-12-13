import { getAssociatedTokenAddressSync } from "@solana/spl-token";

import {
	Connection,
	Keypair,
	PublicKey,
	LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import { CONNECTION, pumpfunSDK } from "./utils";

export function calculatePumpCurvePrice(bondingCurveData) {
	const { virtualTokenReserves, virtualSolReserves } = bondingCurveData;

	return (
		Number(virtualSolReserves) /
		LAMPORTS_PER_SOL /
		(Number(virtualTokenReserves) / 10 ** 6)
	);
}

export async function getMarketcap(mintAddress) {
	const boundingCurveAccount = await pumpfunSDK.getBondingCurveAccount(
		new PublicKey(mintAddress)
	);

	if (!boundingCurveAccount.complete) {
		const price = calculatePumpCurvePrice(boundingCurveAccount);

		return {
			marketcap:
				price *
				(Number(boundingCurveAccount.tokenTotalSupply) / 10 ** 6),
			isNotComplete: true,
		};
	}

	const request = await fetch(
		`https://api.jup.ag/price/v2?ids=${mintAddress}`
	);

	const response = await request.json();

	return {
		marketcap:
			response.data[mintAddress].price *
			(Number(boundingCurveAccount.tokenTotalSupply) / 10 ** 6),
	};
}

class MarketcapChecker {
	callbacks: {
		[key: string]: {
			eventName: string;
			callbacks: Array<Function>;
			filters: {
				mintAddress?: string;
				ownerAddress?: string;
			};
		};
	} = {};

	inited = false;

	interval: any;

	refreshRate = 3000;

	start = () => {
		this.inited = true;

		this.getMartketCap();
	};

	async getMartketCap() {
		let checkPriceAddresses = Object.keys(this.callbacks);

		if (checkPriceAddresses.length === 0) {
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve(null);
				}, this.refreshRate);
			});

			this.getMartketCap();

			return;
		}

		try {
			let totalSupplies = {};

			for (let mintAddress of checkPriceAddresses) {
				const boundingCurveAccount =
					await pumpfunSDK.getBondingCurveAccount(
						new PublicKey(mintAddress)
					);

				if (boundingCurveAccount) {
					totalSupplies[mintAddress] =
						Number(boundingCurveAccount.tokenTotalSupply) / 10 ** 6;
				}
			}

			const request = await fetch(
				`https://api.jup.ag/price/v2?ids=${checkPriceAddresses.join(
					","
				)}`
			);

			const response = await request.json();

			for (let mintAddress of checkPriceAddresses) {
				const price = response.data[mintAddress].price;

				for (let callback of this.callbacks[mintAddress].callbacks) {
					callback(
						{
							marketcap: price * totalSupplies[mintAddress],
						},
						null,
						null
					);
				}
			}
		} catch (err) {
			console.log(err);
		} finally {
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve(null);
				}, this.refreshRate);
			});

			this.getMartketCap();
		}
	}

	dispose = () => {
		this.inited = false;
		clearInterval(this.interval);
	};

	addEventListener = (
		eventName,
		callback,
		filters?: {
			mintAddress?: string;
			ownerAddress?: string;
		}
	) => {
		if (!this.inited) {
			this.start();
		}

		if (!this.callbacks[filters.mintAddress]) {
			this.callbacks[filters.mintAddress] = {
				eventName,
				callbacks: [],
				filters,
			};
		}

		this.callbacks[filters.mintAddress].callbacks.push(callback);
	};

	removeEventListener = (
		eventName,
		callback,
		filters?: {
			mintAddress?: string;
			ownerAddress?: string;
		}
	) => {
		if (!this.callbacks[filters.mintAddress]) {
			return;
		}

		this.callbacks[filters.mintAddress].callbacks = this.callbacks[
			filters.mintAddress
		].callbacks.filter((cb) => cb !== callback);

		if (this.callbacks[filters.mintAddress].callbacks.length === 0) {
			delete this.callbacks[filters.mintAddress];
		}

		if (Object.keys(this.callbacks).length === 0) {
			this.dispose();
		}
	};
}

export const marketcapChecker = new MarketcapChecker();
