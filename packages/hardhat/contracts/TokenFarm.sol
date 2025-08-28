// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./DappToken.sol";
import "./LPToken.sol";



/**
 * @title Proportional Token Farm
 * @notice Una granja de staking donde las recompensas se distribuyen proporcionalmente al total stakeado.
 */
contract TokenFarm {
    //******************************* */ 
    // Variables de estado
    //******************************* */

    string public name = "Proportional Token Farm";
    address public owner;
    DAppToken public dappToken;
    LPToken public lpToken;

    uint256 public constant REWARD_PER_BLOCK = 1e18; // Recompensa por bloque (total para todos los usuarios)
    uint256 public totalStakingBalance; // Total de tokens en staking

    address[] public stakers;

    //******************************* */
    // Struct - Bonus-2
    //******************************* */
    struct StakingUser {
        uint256 stakingBalance;
        uint256 checkpoint;
        uint256 pendingRewards;
        bool hasStaked;
        bool isStaking;
    }

    mapping(address => StakingUser) public stakingUsers;

    /*
    // mapping(address => uint256) public stakingBalance;
    // mapping(address => uint256) public checkpoints;
    // mapping(address => uint256) public pendingRewards;
    // mapping(address => bool) public hasStaked;
    // mapping(address => bool) public isStaking;
    */

    //******************************* */
    // Eventos
    //******************************* */
    // Agregar eventos para Deposit, Withdraw, RewardsClaimed y RewardsDistributed.
    // FIXME: FIXME: Los parametros de los eventos 
    event Deposit(address indexed user,uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDistributed(address indexed distributor);

    //******************************* */
    // Constructor
    //******************************* */
    constructor(DAppToken _dappToken, LPToken _lpToken) {
        // Configurar las instancias de los contratos de DappToken y LPToken.
        dappToken = _dappToken;
        lpToken = _lpToken; 
        
        // Configurar al owner del contrato como el creador de este contrato.
        owner = msg.sender;

    }

    //******************************* */
    // Modificadores - Bonus-1
    //******************************* */
    modifier onlyOwner() {
        require(msg.sender == owner, "TokenFarm: Caller is not the owenr ");
        _;
    }

    modifier onlyStaker() {
        require(stakingUsers[msg.sender].isStaking && stakingUsers[msg.sender].stakingBalance > 0,"TokenFarm: Caller is not staking" );
        _;
    }


    //******************************* */
    // Funciones - Logica Princiapl
    //******************************* */

    /**
     * @notice Deposita tokens LP para staking.
     * @param _amount Cantidad de tokens LP a depositar.
     */
    function deposit(uint256 _amount) external{
        // Verificar que _amount sea mayor a 0.
        require(_amount > 0, "Amount must be greater than 0");

        StakingUser storage userInfo = stakingUsers[msg.sender];

        // Primero calculammos recompensas pendientes con el balance anterior
        distributeRewards(msg.sender);

        // Actualizar el balance de staking del usuario en stakingBalance.
        userInfo.stakingBalance += _amount;

        // Incrementar totalStakingBalance con _amount.
        totalStakingBalance += _amount;

        // Si el usuario nunca ha hecho staking antes, agregarlo al array stakers y marcar hasStaked como true.
        if (!userInfo.hasStaked) {
            stakers.push(msg.sender);
            userInfo.hasStaked = true;
            // userInfo.checkpoint = block.number; // FIXME Si checkpoints del usuario está vacío, inicializarlo con el número de bloque actual.
        }
        // Actualizar isStaking del usuario a true.
        userInfo.isStaking = true;

        // Transferir tokens LP del usuario a este contrato.
        require(
            lpToken.transferFrom(msg.sender, address(this), _amount), "LPToken: Deposit Transfer failed"
        );

        // Emitir un evento de depósito.
        emit Deposit(msg.sender, _amount);
    }

    /**
     * @notice Retira todos los tokens LP en staking.
     */
    function withdraw() external onlyStaker {
        // Verificar que el usuario está haciendo staking (isStaking == true).
        /// Lo hace con el Modifier OnlyStaker

        // Obtener el balance de staking del usuario.
        StakingUser storage userInfo = stakingUsers[msg.sender];
        uint balance = userInfo.stakingBalance;

        // Verificar que el balance de staking sea mayor a 0.
        require(balance > 0, "No Balance to withdraw");

        // Llamar a distributeRewards para calcular y actualizar las recompensas pendientes antes de restablecer el balance.
        distributeRewards(msg.sender);

        // Restablecer stakingBalance del usuario a 0.
        userInfo.stakingBalance = 0;

        // Reducir totalStakingBalance en el balance que se está retirando.
        totalStakingBalance -= balance;

        // Actualizar isStaking del usuario a false.
        userInfo.isStaking = false;

        // Transferir los tokens LP de vuelta al usuario.
        require(
            lpToken.transfer(msg.sender, balance), "LPToken: Withdrawl Transfer failed"
        );

        // Emitir un evento de retiro.
        emit Withdraw(msg.sender, balance);
    }

    /**
     * @notice Reclama recompensas pendientes.
     */
    function claimRewards() external {
        // Primero, actualizamos las recompensas pendientes del usuario hasta el bloque actual.
        distributeRewards(msg.sender);

        StakingUser storage userInfo = stakingUsers[msg.sender];
        // Obtener el monto de recompensas pendientes del usuario desde pendingRewards.
        uint256 pendingAmount = userInfo.pendingRewards;

        // Verificar que el monto de recompensas pendientes sea mayor a 0.
        require(pendingAmount > 0, "No rewards to claim");

        // Restablecer las recompensas pendientes del usuario a 0.
        userInfo.pendingRewards = 0;

        // Llamar a la función de acuñación (mint) en el contrato DappToken para transferir las recompensas al usuario.
        dappToken.mint(msg.sender, pendingAmount);

        // Emitir un evento de reclamo de recompensas.
        emit RewardsClaimed(msg.sender, pendingAmount);
    }

    /**
     * @notice Distribuye recompensas a todos los usuarios en staking.
     */
    function distributeRewardsAll() external onlyOwner {
        // Verificar que la llamada sea realizada por el owner.
        // Iterar sobre todos los usuarios en staking almacenados en el array stakers.
        for (uint i = 0; i < stakers.length; i++) {
            address stakerAddress = stakers[i];

            // Para cada usuario, si están haciendo staking (isStaking == true), llamar a distributeRewards.
            if (stakingUsers[stakerAddress].isStaking) {
                distributeRewards(stakerAddress);
            }
        }
        // Emitir un evento indicando que las recompensas han sido distribuidas.
        emit RewardsDistributed(msg.sender);
    }


    /**
     * @notice Calcula y distribuye las recompensas proporcionalmente al staking total.
     * @dev La función toma en cuenta el porcentaje de tokens que cada usuario tiene en staking con respecto
     *      al total de tokens en staking (`totalStakingBalance`).
     *
     * Funcionamiento:
     * 1. Se calcula la cantidad de bloques transcurridos desde el último checkpoint del usuario.
     * 2. Se calcula la participación proporcional del usuario:
     *    share = stakingBalance[beneficiary] / totalStakingBalance
     * 3. Las recompensas para el usuario se determinan multiplicando su participación proporcional
     *    por las recompensas por bloque (`REWARD_PER_BLOCK`) y los bloques transcurridos:
     *    reward = REWARD_PER_BLOCK * blocksPassed * share
     * 4. Se acumulan las recompensas calculadas en `pendingRewards[beneficiary]`.
     * 5. Se actualiza el checkpoint del usuario al bloque actual.
     *
     * Ejemplo Práctico:
     * - Supongamos que:
     *    Usuario A ha stakeado 100 tokens.
     *    Usuario B ha stakeado 300 tokens.
     *    Total de staking (`totalStakingBalance`) = 400 tokens.
     *    `REWARD_PER_BLOCK` = 1e18 (1 token total por bloque).
     *    Han transcurrido 10 bloques desde el último checkpoint.
     *
     * Cálculo:
     * - Participación de Usuario A:
     *   shareA = 100 / 400 = 0.25 (25%)
     *   rewardA = 1e18 * 10 * 0.25 = 2.5e18 (2.5 tokens).
     *
     * - Participación de Usuario B:
     *   shareB = 300 / 400 = 0.75 (75%)
     *   rewardB = 1e18 * 10 * 0.75 = 7.5e18 (7.5 tokens).
     *
     * Resultado:
     * - Usuario A acumula 2.5e18 en `pendingRewards`.
     * - Usuario B acumula 7.5e18 en `pendingRewards`.
     *
     * Nota:
     * Este sistema asegura que las recompensas se distribuyan proporcionalmente y de manera justa
     * entre todos los usuarios en función de su contribución al staking total.
     */
    function distributeRewards(address beneficiary) private {
        // Obtener el último checkpoint del usuario desde checkpoints.
        StakingUser storage userInfo = stakingUsers[beneficiary];
        uint256 lastCheckpoint = userInfo.checkpoint;

        // Si un usuario no tiene balance, no hay recompensas que calcular.
        // Simplemente se actualiza su checkpoint al bloque actual y se termina la ejecucion.
        if (userInfo.stakingBalance == 0) {
            userInfo.checkpoint = block.number;
            return;
        }

        // Verificar que el número de bloque actual sea mayor al checkpoint y que totalStakingBalance sea mayor a 0.
        if (totalStakingBalance > 0 && userInfo.stakingBalance > 0 && block.number > lastCheckpoint) {
            
            // Calcular la cantidad de bloques transcurridos desde el último checkpoint.
            uint256 blocksPassed = block.number - lastCheckpoint;
            
            // Calcular la proporción del staking del usuario en relación al total staking (stakingBalance[beneficiary] / totalStakingBalance).
            // Calcular las recompensas del usuario multiplicando la proporción por REWARD_PER_BLOCK y los bloques transcurridos.
            uint256 userReward = (REWARD_PER_BLOCK * blocksPassed * userInfo.stakingBalance) / totalStakingBalance;
            
            // Actualizar las recompensas pendientes del usuario en pendingRewards.
            userInfo.pendingRewards += userReward;

        }

        // Actualizar el checkpoint del usuario al bloque actual.
        userInfo.checkpoint = block.number;

    }


}
