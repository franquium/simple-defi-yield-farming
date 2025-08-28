import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the entire TokenFarm DeFi system including:
 * 1. LPToken
 * 2. DAppToken (the reward token)
 * 3. TokenFarm (which depends on the two tokens)
 *
 * It also handles the crucial post-deployment step of transferring DAppToken's ownership
 * to the TokenFarm contract, allowing it to mint rewards.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployTokenFarm: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // 1. Desplegar LPToken
  await deploy("LPToken", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });
  const lpToken = await hre.ethers.getContract<Contract>("LPToken", deployer);
  console.log("LPToken desplegado en:", await lpToken.getAddress());

  // 2. Desplegar DAppToken
  await deploy("DAppToken", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });
  const dappToken = await hre.ethers.getContract<Contract>("DAppToken", deployer);
  console.log(" DAppToken desplegado en:", await dappToken.getAddress());

  // 3. Paso: Desplegar TokenFarm
  await deploy("TokenFarm", {
    from: deployer,
    args: [await dappToken.getAddress(), await lpToken.getAddress()],
    log: true,
    autoMine: true,
  });
  const tokenFarm = await hre.ethers.getContract<Contract>("TokenFarm", deployer);
  console.log(" TokenFarm desplegado en:", await tokenFarm.getAddress());

  // 4. Paso: Transferir la Propiedad de DAppToken
  console.log("\n Transferiendo propiedad de DAppToken a TokenFarm...");
  const currentOwner = await dappToken.owner();
  if (currentOwner.toLowerCase() === deployer.toLowerCase()) {
    const transferTx = await dappToken.transferOwnership(await tokenFarm.getAddress());
    console.log("...esperando confirmación de la transacción...");
    await transferTx.wait(); // Esperamos a que la transacción se mine
    console.log(" Propiedad transferida! El nuevo propietario de DAppToken es:", await dappToken.owner());
  } else {
    console.log("La propiedad ya fue transferida o el deployer no es el dueño. Omitiendo transferencia.");
  }
};

export default deployTokenFarm;

// Tags para el despliegue selectivo
deployTokenFarm.tags = ["TokenFarm", "All"];
