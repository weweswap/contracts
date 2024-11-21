import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";

describe.only("Dynamic Merge / Eater Contract", function () {
	const decimals = 18;

	async function deployFixture() {
		const [owner, otherAccount] = await ethers.getSigners();

		const Wewe = await ethers.getContractFactory("Wewe");
		const wewe = await Wewe.deploy();

		const Token = await ethers.getContractFactory("MockToken2");
		const token = await Token.deploy("Token", "TKN", decimals);

		// Max supply of 1000 tokens to eat
		const vestingPeriod = 60;

		const virtualFomo = ethers.parseUnits("800", decimals);
		const virtualWeWe = ethers.parseUnits("1000", decimals);

		const Merge = await ethers.getContractFactory("DynamicEater");
		const merge = await Merge.deploy(await wewe.getAddress(), await token.getAddress(), vestingPeriod, virtualFomo, virtualWeWe);

		const isPaused = await merge.paused();
		expect(isPaused).to.be.false;

		const deployedVirtualFomo = await merge.virtualToken();
		expect(deployedVirtualFomo).to.equal(ethers.parseUnits("800", 18));

		await token.transfer(otherAccount, ethers.parseUnits("1000000", decimals));

		const mergeAddress = await merge.getAddress();

		// Arrange
		await wewe.approve(mergeAddress, ethers.parseUnits("1000000", 18));
		await token.connect(otherAccount).approve(mergeAddress, ethers.parseUnits("1000000", decimals));

		return { owner, otherAccount, token, wewe, merge };
	}

	describe("Merge with dynamic rates", () => {
		it("Should get price as percent at start of bonding curve", async () => {
			const { merge } = await loadFixture(deployFixture);

			const price = await merge.getCurrentPrice();
			expect(price).to.equal(1250);
		});

		it("Should calculate rates with large numbers", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			// Deposit wewe to setup the merge
			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			expect(totalVested).to.equal(0);

			// In 10^18 we we
			let weweAmount = await merge.calculateTokensOut(ethers.parseUnits("1", decimals));
			expect(weweAmount).to.equal(1248439450686641697n);

			weweAmount = await merge.calculateTokensOut(ethers.parseUnits("1", decimals));
			expect(weweAmount).to.equal(1248439450686641697n);

			weweAmount = await merge.calculateTokensOut(ethers.parseUnits("200", decimals));
			expect(weweAmount).to.equal(200000000000000000000n);

			weweAmount = await merge.calculateTokensOut(ethers.parseUnits("500", decimals));
			expect(weweAmount).to.equal(384615384615384615384n);

			await merge.connect(otherAccount).merge(ethers.parseUnits("100000", 9));
			totalVested = await merge.totalVested();
		});

		it("Should merge before max supply and not after max supply", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			// Deposit wewe to setup the merge
			await merge.deposit(ethers.parseEther("10000"));
			await merge.setMaxSupply(ethers.parseUnits("100000", decimals));

			await merge.connect(otherAccount).merge(ethers.parseUnits("100000", decimals));

			// Tokens
			let totalVested = await merge.totalVested();
			let totalMerged = await merge.totalMerged();
			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(100000000000000000000000n);

			await expect(merge.connect(otherAccount).merge(ethers.parseUnits("1", 9))).to.be.revertedWith("_merge: More than max supply");

			// Turn off max supply
			await merge.setMaxSupply(0);

			await merge.connect(otherAccount).merge(ethers.parseUnits("100000", decimals));
			totalVested = await merge.totalVested();
			totalMerged = await merge.totalMerged();

			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(200000000000000000000000n);
		});

		it("Should be able to merge when merkle root is bytes 0", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			const amount = ethers.parseUnits("100", decimals);
			await expect(merge.connect(otherAccount).merge(amount)).to.emit(merge, "Merged");
		});

		it("Should be able to merge with proof", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			expect(totalVested).to.be.eq(0);

			await merge.setMerkleRoot("0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3");
			const proof = ["0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89"];

			await expect(merge.connect(otherAccount).mergeWithProof(10000, 1000, proof)).to.revertedWith("mergeWithProof: Invalid proof");
			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1000, proof)).to.emit(merge, "Merged");

			totalVested = await merge.totalVested();
			const totalMerged = await merge.totalMerged();

			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(1000);
		});

		it("Should be able to merge multiple times with proof", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			let totalMerged = await merge.totalMerged();
			expect(totalVested).to.be.eq(0);
			expect(totalMerged).to.be.eq(0);

			await merge.setMerkleRoot("0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3");
			const proof = ["0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89"];

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 100, proof)).to.emit(merge, "Merged");

			totalVested = await merge.totalVested();
			totalMerged = await merge.totalMerged();
			let vested = await merge.vestings(otherAccount.address);

			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(100);
			expect(vested.merged).to.eq(100);
			expect(vested.amount).to.eq(124);

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 100, proof)).to.emit(merge, "Merged");

			totalMerged = await merge.totalMerged();
			vested = await merge.vestings(otherAccount.address);
			expect(totalMerged).to.eq(200);
			expect(vested.merged).to.eq(200);
			expect(vested.amount).to.eq(248);

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 800, proof)).to.emit(merge, "Merged");
			totalMerged = await merge.totalMerged();
			vested = await merge.vestings(otherAccount.address);
			expect(totalMerged).to.eq(1000);
			expect(vested.merged).to.eq(1000);

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1, proof)).to.be.revertedWith("mergeWithProof: Already merged");
		});

		it("Should be perform partial merges", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			let totalMerged = await merge.totalMerged();
			expect(totalVested).to.be.eq(0);
			expect(totalMerged).to.be.eq(0);

			await merge.setMerkleRoot("0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3");
			const proof = ["0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89"];

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 500, proof))
				.to.emit(merge, "Merged");

			totalVested = await merge.totalVested();
			totalMerged = await merge.totalMerged();
			let vested = await merge.vestings(otherAccount.address);

			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(500);
			expect(vested.merged).to.eq(500);

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1000, proof))
				.to.emit(merge, "Merged");

			totalMerged = await merge.totalMerged();
			vested = await merge.vestings(otherAccount.address);
			expect(totalMerged).to.eq(1000);
			expect(vested.merged).to.eq(1000);
		});

		it("Should not be able to replay proof", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			expect(totalVested).to.be.eq(0);

			await merge.setMerkleRoot("0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3");
			const proof = ["0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89"];

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1000, proof)).to.emit(merge, "Merged");

			// Replay proof
			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1000, proof)).to.revertedWith("mergeWithProof: Already merged");
		});
	});

	describe.only("Vaults", () => {
		it("Should test vault", async function () {
			const { owner } = await deployFixture();

			const vault_abi = [{
				"inputs": [
					{
						"components": [
							{
								"components": [
									{
										"internalType": "uint128",
										"name": "liquidity",
										"type": "uint128"
									},
									{
										"components": [
											{
												"internalType": "int24",
												"name": "lowerTick",
												"type": "int24"
											},
											{
												"internalType": "int24",
												"name": "upperTick",
												"type": "int24"
											},
											{
												"internalType": "uint24",
												"name": "feeTier",
												"type": "uint24"
											}
										],
										"internalType": "struct Range",
										"name": "range",
										"type": "tuple"
									}
								],
								"internalType": "struct PositionLiquidity[]",
								"name": "burns",
								"type": "tuple[]"
							},
							{
								"components": [
									{
										"internalType": "uint128",
										"name": "liquidity",
										"type": "uint128"
									},
									{
										"components": [
											{
												"internalType": "int24",
												"name": "lowerTick",
												"type": "int24"
											},
											{
												"internalType": "int24",
												"name": "upperTick",
												"type": "int24"
											},
											{
												"internalType": "uint24",
												"name": "feeTier",
												"type": "uint24"
											}
										],
										"internalType": "struct Range",
										"name": "range",
										"type": "tuple"
									}
								],
								"internalType": "struct PositionLiquidity[]",
								"name": "mints",
								"type": "tuple[]"
							},
							{
								"components": [
									{
										"internalType": "bytes",
										"name": "payload",
										"type": "bytes"
									},
									{
										"internalType": "address",
										"name": "router",
										"type": "address"
									},
									{
										"internalType": "uint256",
										"name": "amountIn",
										"type": "uint256"
									},
									{
										"internalType": "uint256",
										"name": "expectedMinReturn",
										"type": "uint256"
									},
									{
										"internalType": "bool",
										"name": "zeroForOne",
										"type": "bool"
									}
								],
								"internalType": "struct SwapPayload",
								"name": "swap",
								"type": "tuple"
							},
							{
								"internalType": "uint256",
								"name": "minBurn0",
								"type": "uint256"
							},
							{
								"internalType": "uint256",
								"name": "minBurn1",
								"type": "uint256"
							},
							{
								"internalType": "uint256",
								"name": "minDeposit0",
								"type": "uint256"
							},
							{
								"internalType": "uint256",
								"name": "minDeposit1",
								"type": "uint256"
							}
						],
						"internalType": "struct Rebalance",
						"name": "rebalanceParams_",
						"type": "tuple"
					}
				],
				"name": "rebalance",
				"outputs": [],
				"stateMutability": "nonpayable",
				"type": "function"
			}];

			const VAULT_ADDRESS = "0x137c8040d44e25d2c7677224165da6aa0901e33b";

			const vault_abi_2 = ["function factory() view returns (address)", "function owner() view returns (address)"];

			const vaultContract2 = new ethers.Contract(
				VAULT_ADDRESS,
				vault_abi_2,
				owner
			);

			const factory = await vaultContract2.factory();
			console.log("Factory: ", factory);

			expect(factory).to.be.eq("0x33128a8fC17869897dcE68Ed026d694621f6FDfD");

			const _owner = await vaultContract2.owner();
			console.log("Owner: ", _owner);


			await network.provider.request({
				method: "hardhat_impersonateAccount",
				params: [_owner],
			});

			// send some eth to the impersonated account from owner
			await owner.sendTransaction({
				to: _owner,
				value: ethers.parseEther("1.0"),
			});

			const impersonatedSigner = await ethers.getSigner(_owner);

			const vaultContract = new ethers.Contract(
				VAULT_ADDRESS,
				vault_abi,
				impersonatedSigner
			);

			await vaultContract.connect(impersonatedSigner).rebalance({
				burns: [],
				mints: [],
				swap: {
					payload: "0x",
					router: ethers.ZeroAddress,
					amountIn: 0,
					expectedMinReturn: 0,
					zeroForOne: false
				},
				minBurn0: 0,
				minBurn1: 0,
				minDeposit0: 0,
				minDeposit1: 0,
			});
		});
	});
});
