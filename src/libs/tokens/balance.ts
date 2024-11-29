import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
	Connection,
	Keypair,
	PublicKey,
	LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { CONNECTION } from "./utils";

class BalanceChecker {
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

	start = () => {
		this.inited = true;

		setInterval(() => {
			Object.values(this.callbacks).forEach(
				({ eventName, callbacks, filters }) => {
					if (!filters?.mintAddress || !filters.ownerAddress) {
						callbacks.forEach((callback) => {
							callback(null, null, null);
						});
						return;
					}

					const associatedTokenAddress =
						getAssociatedTokenAddressSync(
							new PublicKey(filters.mintAddress),
							new PublicKey(filters.ownerAddress)
						);

					this.fetchBalance(associatedTokenAddress).then(
						(balanceInfo) => {
							callbacks.forEach((callback) => {
								callback(balanceInfo, null, null);
							});
						}
					);
				}
			);
		}, 5000);
	};

	dispose = () => {
		this.inited = false;
		clearInterval(this.interval);
	};

	async fetchBalance(associatedTokenAddress: PublicKey) {
		if (associatedTokenAddress === null) {
			return { balance: null, mint: null };
		}

		const accountInfo = await CONNECTION.getParsedAccountInfo(
			associatedTokenAddress
		);

		return {
			balance:
				// @ts-ignore
				accountInfo.value?.data?.parsed?.info?.tokenAmount?.uiAmount,
			// @ts-ignore
			mint: accountInfo.value?.data?.parsed?.info?.mint,
		};
	}

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

		if (!this.callbacks[filters.ownerAddress + filters.mintAddress]) {
			this.callbacks[filters.ownerAddress + filters.mintAddress] = {
				eventName,
				callbacks: [],
				filters,
			};
		}

		this.callbacks[
			filters.ownerAddress + filters.mintAddress
		].callbacks.push(callback);
	};

	removeEventListener = (
		eventName,
		callback,
		filters?: {
			mintAddress?: string;
			ownerAddress?: string;
		}
	) => {
		if (!this.callbacks[filters.ownerAddress + filters.mintAddress]) {
			return;
		}

		this.callbacks[filters.ownerAddress + filters.mintAddress].callbacks =
			this.callbacks[
				filters.ownerAddress + filters.mintAddress
			].callbacks.filter((cb) => cb !== callback);

		if (
			this.callbacks[filters.ownerAddress + filters.mintAddress].callbacks
				.length === 0
		) {
			delete this.callbacks[filters.ownerAddress + filters.mintAddress];
		}

		if (Object.keys(this.callbacks).length === 0) {
			this.dispose();
		}
	};
}

export const balanceChecker = new BalanceChecker();
