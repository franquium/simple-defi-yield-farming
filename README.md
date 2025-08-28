# # Simple DeFI Yield Farming with Scaffold-ETH 2

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

Este repositorio contiene la implementación de los contratos inteligentes (backend) para un sistema simple de DeFi Yield Farming construido sobre Ethereum. El proyecto se enfoca exclusivamente en la lógica on-chain y su verificación a través de pruebas automatizadas.

**Nota: Este proyecto no incluye una interfaz de usuario funcional (frontend).**

El sistema consta de tres contratos principales:
* `LPToken.sol`: Un token ERC20 que simula los tokens de un pool de liquidez, utilizados para el staking.
* `DAppToken.sol`: Un token ERC20 que actúa como la recompensa de la plataforma.
* `TokenFarm.sol`: El contrato principal que permite a los usuarios depositar (`stake`) sus `LPToken` para ganar `DAppToken` como recompensa de forma proporcional a su participación.

## Requisitos 

Antes de comenzar, asegúrate de tener instaladas las siguientes herramientas:

* [Node (>= v20.0.0)](https://nodejs.org/en/download/)
* Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) o [v2+](https://yarnpkg.com/getting-started/install))
* [Git](https://git-scm.com/downloads)

## Guía de Inicio y Pruebas

Sigue los siguientes pasos para poner en marcha, probar e interactuar con el proyecto:

1.  Descargar el proyecto e instalación de `yarn`:

```
git clone https://github.com/franquium/simple-defi-yield-farming.git
cd simple-defi-yield-farming
yarn install
```

2. Correr la red local en la primera terminal:

```
yarn chain
```

Este comando inicia una red local de Ethereum usando Hardhat. Esta terminal debe permanecer abierta durante todo el proceso.

3. En la segunda terminal, desplegar los Contratos:

```
yarn deploy
```

Este comando ejecutará el script ubicado en packages/hardhat/deploy/ que no solo despliega los contratos, sino que también configura las dependencias necesarias (como la transferencia de propiedad del token de recompensas).

4.  Ejecutar las Pruebas Automatizadas:

```
yarn test
```

Este comando ejecutará el archivo `TestTokenFarm.ts` ubicado en `packages/hardhat/test/` y debería mostrar que todas las pruebas pasan con éxito.


## Documentación

Visitar [docs](https://docs.scaffoldeth.io) para tener la documentación completa sobre Scaffold-ETH 2.

## Licencia
Este proyecto está licenciado bajo la Licencia MIT.

## Author
Creado por @franquium 
> *"Wir muessen wissen, wir werden wissen!."* - David Hilbert

PS: **Nota: Este proyecto no incluye una interfaz de usuario funcional (frontend).**


