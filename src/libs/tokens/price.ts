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

export async function getPrice(mintAddress) {
	const boundingCurveAccount = await pumpfunSDK.getBondingCurveAccount(
		new PublicKey(mintAddress)
	);

	if (boundingCurveAccount && !boundingCurveAccount?.complete) {
		const price = calculatePumpCurvePrice(boundingCurveAccount);

		return {
			price: Number(price),
		};
	}

	const request = await fetch(
		`https://api.jup.ag/price/v2?ids=${mintAddress}`
	);

	const response = await request.json();

	return {
		price: response.data[mintAddress].price,
	};
}

class PriceChecker {
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

	refreshRate = 3000;

	start = () => {
		this.inited = true;

		this.getPrices();
	};

	getPrices = async () => {
		if (!this.inited) return;

		let checkPriceAddresses = Object.keys(this.callbacks);

		if (checkPriceAddresses.length === 0) {
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve(null);
				}, this.refreshRate);
			});

			this.getPrices();

			return;
		}

		try {
			// check if bounding curve is complete
			for (let mintAddress of checkPriceAddresses) {
				const boundingCurveAccount =
					await pumpfunSDK.getBondingCurveAccount(
						new PublicKey(mintAddress)
					);

				if (!boundingCurveAccount || boundingCurveAccount?.complete) {
					continue;
				}

				// remove from checkPriceAddresses
				checkPriceAddresses = checkPriceAddresses.filter(
					(address) => address !== mintAddress
				);

				const price = calculatePumpCurvePrice(boundingCurveAccount);

				for (let callback of this.callbacks[mintAddress].callbacks) {
					callback(
						{
							price: Number(price),
						},
						null,
						null
					);
				}
			}

			// if not complete check the price from blockchain.

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
							price: Number(price),
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
			this.getPrices();
		}
	};

	dispose = () => {
		this.inited = false;
	};

	addEventListener = (
		eventName,
		callback,
		filters?: {
			mintAddress?: string;
			ownerAddress?: string;
		}
	) => {
		if (!this.callbacks[filters.mintAddress]) {
			this.callbacks[filters.mintAddress] = {
				eventName,
				callbacks: [],
				filters,
			};
		}

		this.callbacks[filters.mintAddress].callbacks.push(callback);

		if (!this.inited) {
			this.start();
		}
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

export const priceChecker = new PriceChecker();
