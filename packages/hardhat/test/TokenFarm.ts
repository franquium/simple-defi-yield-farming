import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Fixture: despliega LPToken, DAppToken, TokenFarm; transfiere ownership de DAppToken a la Farm;
 * mintea LP a user1 y user2 para pruebas.
 */
async function deployAllFixture() {
  const [deployer, user1, user2] = await ethers.getSigners();

  // 1) Deploy tokens
  const LPToken = await ethers.getContractFactory("LPToken");
  const lpToken = await LPToken.deploy(deployer.address);
  await lpToken.waitForDeployment();

  const DAppToken = await ethers.getContractFactory("DAppToken");
  const dappToken = await DAppToken.deploy(deployer.address);
  await dappToken.waitForDeployment();

  // 2) Deploy farmW
  const TokenFarm = await ethers.getContractFactory("TokenFarm");
  const tokenFarm = await TokenFarm.deploy(await dappToken.getAddress(), await lpToken.getAddress());
  await tokenFarm.waitForDeployment();

  // 3) Transfer ownership de DAppToken a la farm (claimRewards mintea desde la farm)
  const farmAddr = await tokenFarm.getAddress();
  const currentOwner = await dappToken.owner();
  if (currentOwner.toLowerCase() !== farmAddr.toLowerCase()) {
    const tx = await dappToken.connect(deployer).transferOwnership(farmAddr);
    await tx.wait();
  }

  // 4) Mint LP a usuarios
  await (await lpToken.connect(deployer).mint(user1.address, ethers.parseEther("1000"))).wait();
  await (await lpToken.connect(deployer).mint(user2.address, ethers.parseEther("2000"))).wait();

  return { deployer, user1, user2, lpToken, dappToken, tokenFarm };
}

describe("TokenFarm (Bonus 3: Pruebas)", function () {
  /**
   * Prueba 1:
   * "Acuñar (mint) tokens LP para un usuario y realizar un depósito de esos tokens."
   * - user1 recibe LP
   * - aprueba a la farm
   * - deposita
   * - se emite evento Deposit y se actualizan balances en farm
   */
  it("Minteo de tokens LP y depósito", async function () {
    const { user1, lpToken, tokenFarm } = await loadFixture(deployAllFixture);

    const farmAddr = await tokenFarm.getAddress();
    // aprobar y depositar
    await (await lpToken.connect(user1).approve(farmAddr, ethers.parseEther("100"))).wait();

    // antes del depósito, farm no tiene LP
    expect(await lpToken.balanceOf(farmAddr)).to.equal(0n);

    // depositar y esperar evento
    await expect(tokenFarm.connect(user1).deposit(ethers.parseEther("100")))
      .to.emit(tokenFarm, "Deposit")
      .withArgs(user1.address, ethers.parseEther("100"));

    // verificar balances on-chain
    expect(await lpToken.balanceOf(farmAddr)).to.equal(ethers.parseEther("100"));
    const u = await tokenFarm.stakingUsers(user1.address);
    expect(u.stakingBalance).to.equal(ethers.parseEther("100"));
    expect(await tokenFarm.totalStakingBalance()).to.equal(ethers.parseEther("100"));
    expect(u.isStaking).to.equal(true);
  });

  /**
   * Prueba 2:
   * "Que la plataforma distribuya correctamente las recompensas a todos los usuarios en staking."
   * - user1 deposita 100, user2 deposita 300
   * - se minan ~10 bloques
   * - owner llama distributeRewardsAll()
   * - ambos tienen pendingRewards > 0 y el de user2 > user1
   */
  it("Distribuye recompensas proporcionalmente a todos los stakers", async function () {
    const { deployer, user1, user2, lpToken, tokenFarm } = await loadFixture(deployAllFixture);

    const farmAddr = await tokenFarm.getAddress();

    // depósitos con proporciones 100 : 300
    await (await lpToken.connect(user1).approve(farmAddr, ethers.parseEther("100"))).wait();
    await (await tokenFarm.connect(user1).deposit(ethers.parseEther("100"))).wait();

    await (await lpToken.connect(user2).approve(farmAddr, ethers.parseEther("300"))).wait();
    await (await tokenFarm.connect(user2).deposit(ethers.parseEther("300"))).wait();

    // minar ~10 bloques
    await ethers.provider.send("hardhat_mine", ["0x0A"]);

    // distribuir (owner)
    await expect(tokenFarm.connect(deployer).distributeRewardsAll())
      .to.emit(tokenFarm, "RewardsDistributed")
      .withArgs(deployer.address);

    // verificar pendientes
    const u1 = await tokenFarm.stakingUsers(user1.address);
    const u2 = await tokenFarm.stakingUsers(user2.address);

    expect(u1.pendingRewards).to.be.gt(0n);
    expect(u2.pendingRewards).to.be.gt(0n);
    // proporcionalmente, user2 (300/400) > user1 (100/400)
    expect(u2.pendingRewards).to.be.gt(u1.pendingRewards);
  });

  /**
   * Prueba 3:
   * Que un usuario pueda reclamar recompensas y verificar que se transfirieron correctamente a su cuenta.
   * - user1 deposita
   * - se minan bloques y se distribuye
   * - se captura pendingRewards
   * - user1 hace claimRewards
   * - balance de DAPP del user aumenta exactamente en pendingRewards y pendingRewards queda en 0
   */
  it("Claim de recompensas y verificación de transferencia de DAPP", async function () {
    const { deployer, user1, lpToken, dappToken, tokenFarm } = await loadFixture(deployAllFixture);

    const farmAddr = await tokenFarm.getAddress();

    await (await lpToken.connect(user1).approve(farmAddr, ethers.parseEther("200"))).wait();
    await (await tokenFarm.connect(user1).deposit(ethers.parseEther("200"))).wait();

    // Minamos ~10 bloques
    await ethers.provider.send("hardhat_mine", ["0x0A"]);

    // Owner distribuye para cristalizar pendientes hasta este bloque
    await (await tokenFarm.connect(deployer).distributeRewardsAll()).wait();

    const before = await tokenFarm.stakingUsers(user1.address);
    const beforePending = before.pendingRewards;

    // Calculamos el delta por el bloque extra que ocurrirá al ejecutar claimRewards()
    const RPB = await tokenFarm.REWARD_PER_BLOCK();
    const total = await tokenFarm.totalStakingBalance();
    const perBlockUser = (RPB * before.stakingBalance) / total; // BigInt

    const expectedMint = beforePending + perBlockUser;

    const d0 = await dappToken.balanceOf(user1.address);

    // El evento debe reflejar el pendiente + 1 bloque adicional
    await expect(tokenFarm.connect(user1).claimRewards())
      .to.emit(tokenFarm, "RewardsClaimed")
      .withArgs(user1.address, expectedMint);

    const d1 = await dappToken.balanceOf(user1.address);
    expect(d1 - d0).to.equal(expectedMint);

    const after = await tokenFarm.stakingUsers(user1.address);
    expect(after.pendingRewards).to.equal(0n);
  });

  /**
   * Prueba 4:
   * Que un usuario pueda deshacer el staking de todos los tokens LP depositados y reclamar recompensas pendientes, si las hay
   * - user1 deposita
   * - se minan bloques y se distribuye
   * - user1 hace withdraw (recupera LP) y luego claim de pendientes (si existen)
   * - verificar evento Withdraw, stakingBalance=0, isStaking=false, y pendingRewards llega a 0 tras claim
   */
  it("Withdraw total + claim de pendientes posterior", async function () {
    const { deployer, user1, lpToken, dappToken, tokenFarm } = await loadFixture(deployAllFixture);

    const farmAddr = await tokenFarm.getAddress();

    await (await lpToken.connect(user1).approve(farmAddr, ethers.parseEther("150"))).wait();
    await (await tokenFarm.connect(user1).deposit(ethers.parseEther("150"))).wait();

    await ethers.provider.send("hardhat_mine", ["0x0A"]);
    await (await tokenFarm.connect(deployer).distributeRewardsAll()).wait();

    // Pendiente antes del withdraw
    const before = await tokenFarm.stakingUsers(user1.address);
    const pendingBefore = before.pendingRewards;

    // Al hacer withdraw, se mina 1 bloque y la función llama a distributeRewards(msg.sender)
    // => suma exactamente 'perBlockUser' a pendingRewards.
    const RPB = await tokenFarm.REWARD_PER_BLOCK();
    const total = await tokenFarm.totalStakingBalance();
    const perBlockUser = (RPB * before.stakingBalance) / total; // BigInt

    // Retira LP
    await expect(tokenFarm.connect(user1).withdraw())
      .to.emit(tokenFarm, "Withdraw")
      .withArgs(user1.address, ethers.parseEther("150"));

    const afterW = await tokenFarm.stakingUsers(user1.address);
    expect(afterW.stakingBalance).to.equal(0n);
    expect(afterW.isStaking).to.equal(false);

    // pending tras withdraw = pendingBefore + perBlockUser
    const expectedPendingAfterWithdraw = pendingBefore + perBlockUser;
    expect(afterW.pendingRewards).to.equal(expectedPendingAfterWithdraw);

    // claim (ya con stakeBalance = 0, no se suma nada en _distributeRewards)
    const d0 = await dappToken.balanceOf(user1.address);
    await expect(tokenFarm.connect(user1).claimRewards())
      .to.emit(tokenFarm, "RewardsClaimed")
      .withArgs(user1.address, expectedPendingAfterWithdraw);
    const d1 = await dappToken.balanceOf(user1.address);

    expect(d1 - d0).to.equal(expectedPendingAfterWithdraw);

    const finalU = await tokenFarm.stakingUsers(user1.address);
    expect(finalU.pendingRewards).to.equal(0n);
  });
});
