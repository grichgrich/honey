using UnityEngine;
using System.Threading.Tasks;

/// <summary>
/// Main game controller that uses HoneycombManager
/// </summary>
public class GameController : MonoBehaviour
{
    private void Start()
    {
        InitializeGame();
    }

    private async void InitializeGame()
    {
        try
        {
            // Create initial project
            string projectId = await HoneycombManager.Instance.CreateProject(
                "ChainQuest",
                "player_authority" // Replace with actual wallet authority
            );
            Debug.Log($"Created project: {projectId}");

            // Create player character
            string characterId = await HoneycombManager.Instance.CreateCharacter(
                "space_commander",
                "sun_warriors"
            );
            Debug.Log($"Created character: {characterId}");

            // Start tutorial mission
            string missionId = await HoneycombManager.Instance.StartMission(
                characterId,
                "tutorial_mission"
            );
            Debug.Log($"Started mission: {missionId}");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Game initialization failed: {e.Message}");
        }
    }

    /// <summary>
    /// Example of handling planet attack through Honeycomb
    /// </summary>
    public async Task AttackPlanet(string characterId, string targetPlanetId)
    {
        try
        {
            var tx = await HoneycombManager.Client.CreateAttackPlanetTransaction(
                new HplEdgeClient.Params.CreateAttackPlanetTransactionParams
                {
                    CharacterId = characterId,
                    TargetPlanetId = targetPlanetId,
                    Units = 10
                }
            );

            var txHelper = new HplEdgeClient.Helpers.TransactionHelper(
                tx.CreateAttackPlanetTransaction.Tx
            );

            await txHelper.Sign();

            var response = await HoneycombManager.Client.SendBulkTransactions(
                txHelper.ToSendParams()
            );

            Debug.Log($"Attack executed successfully: {response}");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Attack failed: {e.Message}");
            throw;
        }
    }

    /// <summary>
    /// Example of handling resource harvesting through Honeycomb
    /// </summary>
    public async Task HarvestResources(string characterId, string planetId)
    {
        try
        {
            var tx = await HoneycombManager.Client.CreateHarvestResourcesTransaction(
                new HplEdgeClient.Params.CreateHarvestResourcesTransactionParams
                {
                    CharacterId = characterId,
                    PlanetId = planetId
                }
            );

            var txHelper = new HplEdgeClient.Helpers.TransactionHelper(
                tx.CreateHarvestResourcesTransaction.Tx
            );

            await txHelper.Sign();

            var response = await HoneycombManager.Client.SendBulkTransactions(
                txHelper.ToSendParams()
            );

            Debug.Log($"Resources harvested successfully: {response}");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Harvesting failed: {e.Message}");
            throw;
        }
    }

    /// <summary>
    /// Example of handling research through Honeycomb
    /// </summary>
    public async Task ConductResearch(string characterId, string researchType)
    {
        try
        {
            var tx = await HoneycombManager.Client.CreateResearchTransaction(
                new HplEdgeClient.Params.CreateResearchTransactionParams
                {
                    CharacterId = characterId,
                    ResearchType = researchType
                }
            );

            var txHelper = new HplEdgeClient.Helpers.TransactionHelper(
                tx.CreateResearchTransaction.Tx
            );

            await txHelper.Sign();

            var response = await HoneycombManager.Client.SendBulkTransactions(
                txHelper.ToSendParams()
            );

            Debug.Log($"Research conducted successfully: {response}");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Research failed: {e.Message}");
            throw;
        }
    }
}
