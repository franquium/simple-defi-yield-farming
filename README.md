# # Simple DeFI Yield Farming with Scaffold-ETH 2

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

Este repositorio contiene la implementación de los contratos inteligentes (backend) para un sistema simple de DeFi Yield Farming construido sobre Ethereum. El proyecto se enfoca exclusivamente en la lógica on-chain y su verificación a través de pruebas automatizadas.

**Nota: Este proyecto no incluye una interfaz de usuario (frontend).**

El sistema consta de tres contratos principales:
* `LPToken.sol`: Un token ERC20 que simula los tokens de un pool de liquidez, utilizados para el staking.
* `DAppToken.sol`: Un token ERC20 que actúa como la recompensa de la plataforma.
* `TokenFarm.sol`: El contrato principal que permite a los usuarios depositar (`stake`) sus `LPToken` para ganar `DAppToken` como recompensa de forma proporcional a su participación.

## Requisitos 

BAntes de comenzar, asegúrate de tener instaladas las siguientes herramientas:

* [Node (>= v20.0.0)](https://nodejs.org/en/download/)
* Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) o [v2+](https://yarnpkg.com/getting-started/install))
* [Git](https://git-scm.com/downloads)
## Quickstart

To get started with Scaffold-ETH 2, follow the steps below:

1.  Iniciar la Red Local:

```
cd simple-defi-yield-farming
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

Abre una primera terminal y ejecuta el siguiente comando para iniciar una red local de Ethereum usando Hardhat. Esta terminal debe permanecer abierta durante todo el proceso.

3. On a second terminal,  desplegar los Contratos:

```
yarn deploy
```

Este comando ejecutará el script ubicado en packages/hardhat/deploy/ que no solo despliega los contratos, sino que también configura las dependencias necesarias (como la transferencia de propiedad del token de recompensas).

4.  Ejecutar las Pruebas Automatizadas:

```
yarn test
```

Este comando ejecutará el archivo `TestTokenFarm.ts` ubicado en `packages/hardhat/test/` y debería mostrar que todas las pruebas pasan con éxito.




## Documentation

Visit our [docs](https://docs.scaffoldeth.io) to learn how to start building with Scaffold-ETH 2.

To know more about its features, check out our [website](https://scaffoldeth.io).

