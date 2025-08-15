using UnityEngine;
using HplEdgeClient.Client;
using HplEdgeClient.Params;
using HplEdgeClient.Helpers;
using System.Threading.Tasks;

/// <summary>
/// Main manager class for Honeycomb Protocol integration
/// </summary>
public class HoneycombManager : MonoBehaviour
{
    // Singleton instance
    public static HoneycombManager Instance { get; private set; }

    // Client configurations for different networks
    private static class NetworkConfig
    {
        public const string MAINNET_URL = "https://edge.main.honeycombprotocol.com/";
        public const string HONEYNET_URL = "https://edge.test.honeycombprotocol.com/";
        public const string SONIC_URL = "https://edge-sonic.test.honeycombprotocol.com/";
    }

    // Current network client
    public static HplClient Client { get; private set; }

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeClient();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void InitializeClient()
    {
        #if UNITY_EDITOR || DEVELOPMENT_BUILD
            // Use Honeynet for development
            Client = new HplClient(NetworkConfig.HONEYNET_URL);
            Debug.Log("Initialized Honeycomb Client with Honeynet");
        #else
            // Use Mainnet for production
            Client = new HplClient(NetworkConfig.MAINNET_URL);
            Debug.Log("Initialized Honeycomb Client with Mainnet");
        #endif
    }

    /// <summary>
    /// Creates a new project on the blockchain
    /// </summary>
    public async Task<string> CreateProject(string name, string authority)
    {
        try
        {
            var tx = await Client.CreateCreateProjectTransaction(
                new CreateCreateProjectTransactionParams
                {
                    Name = name,
                    Authority = authority
                }
            );

            var txHelper = new TransactionHelper(
                tx.CreateCreateProjectTransaction.Tx
            );

            await txHelper.Sign();

            var response = await Client.SendBulkTransactions(
                txHelper.ToSendParams()
            );

            Debug.Log($"Project created successfully: {response}");
            return response.ToString();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to create project: {e.Message}");
            throw;
        }
    }

    /// <summary>
    /// Creates a new character on the blockchain
    /// </summary>
    public async Task<string> CreateCharacter(string modelId, string faction)
    {
        try
        {
            var tx = await Client.CreateCreateCharacterTransaction(
                new CreateCreateCharacterTransactionParams
                {
                    ModelId = modelId,
                    Faction = faction
                }
            );

            var txHelper = new TransactionHelper(
                tx.CreateCreateCharacterTransaction.Tx
            );

            await txHelper.Sign();

            var response = await Client.SendBulkTransactions(
                txHelper.ToSendParams()
            );

            Debug.Log($"Character created successfully: {response}");
            return response.ToString();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to create character: {e.Message}");
            throw;
        }
    }

    /// <summary>
    /// Starts a mission for a character
    /// </summary>
    public async Task<string> StartMission(string characterId, string missionId)
    {
        try
        {
            var tx = await Client.CreateStartMissionTransaction(
                new CreateStartMissionTransactionParams
                {
                    CharacterId = characterId,
                    MissionId = missionId
                }
            );

            var txHelper = new TransactionHelper(
                tx.CreateStartMissionTransaction.Tx
            );

            await txHelper.Sign();

            var response = await Client.SendBulkTransactions(
                txHelper.ToSendParams()
            );

            Debug.Log($"Mission started successfully: {response}");
            return response.ToString();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to start mission: {e.Message}");
            throw;
        }
    }

    /// <summary>
    /// Stakes a character in a pool
    /// </summary>
    public async Task<string> StakeCharacter(string characterId, string poolId)
    {
        try
        {
            var tx = await Client.CreateStakeCharacterTransaction(
                new CreateStakeCharacterTransactionParams
                {
                    CharacterId = characterId,
                    PoolId = poolId
                }
            );

            var txHelper = new TransactionHelper(
                tx.CreateStakeCharacterTransaction.Tx
            );

            await txHelper.Sign();

            var response = await Client.SendBulkTransactions(
                txHelper.ToSendParams()
            );

            Debug.Log($"Character staked successfully: {response}");
            return response.ToString();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to stake character: {e.Message}");
            throw;
        }
    }
}
