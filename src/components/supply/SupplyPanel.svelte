<script lang="ts">
  /**
   * L'étal du Fournisseur, en panneau déployé. Une ligne par matière : le prix
   * à l'unité, ce que ça coûte par lot, et ce qu'il reste au quota du jour.
   *
   * Le quota est la vraie information : c'est lui, et non le prix, qui rend la
   * remise en culture désirable (docs/05 §0).
   */
  import { PLANTS } from '../../game-logic/data/plants.data';
  import { getPlant } from '../../game-logic/data/plants.data';
  import {
    isFarmUnlocked,
    isPlantUnlocked,
    isSupplyOpen,
    seedCost,
    supplyPrice,
    supplyQuota,
    supplyRemaining,
  } from '../../game-logic/selectors';
  import { dispatch, game } from '../../stores/game';
  import { FR } from '../../i18n/fr';
  import type { PlantId } from '../../data/schema';

  /** On achète par caisse, pas à l'unité. */
  const LOTS = [1, 5, 10];

  $: state = $game;
  $: available = PLANTS.filter((p) => isPlantUnlocked(state, p.id));
  $: remaining = supplyRemaining(state);
  $: quota = supplyQuota(state);

  /** Ce que la même unité coûterait cultivée — la comparaison qui motive le déblocage. */
  function grownPrice(id: PlantId): number {
    const plant = getPlant(id);
    return Math.round((seedCost(state, id, 'intensive') / Math.max(1, plant.baseYield)) * 10) / 10;
  }

  function canBuy(plant: PlantId, lot: number): boolean {
    return isSupplyOpen(state) && remaining >= lot && state.resources.kess >= supplyPrice(plant) * lot;
  }
</script>

<div class="panel">
  <header class="head">
    <span class="tiny dim">{FR.supply.hint}</span>
    <span class="quota mono tiny" class:spent={remaining === 0}>{FR.supply.quota(remaining, quota)}</span>
  </header>

  {#if !isSupplyOpen(state)}
    <p class="tiny dim">{FR.supply.closedHint}</p>
  {:else if available.length === 0}
    <p class="tiny dim">{FR.supply.empty}</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Matière</th>
          <th class="num">Au comptant</th>
          <th class="num">Cultivée</th>
          <th class="num">Lots</th>
        </tr>
      </thead>
      <tbody>
        {#each available as plant (plant.id)}
          {@const unit = supplyPrice(plant.id)}
          <tr>
            <td>{plant.label}</td>
            <td class="num mono">{unit} ₭</td>
            <td class="num mono dim">
              {#if isFarmUnlocked(state)}{grownPrice(plant.id)} ₭{:else}—{/if}
            </td>
            <td class="num lots">
              {#each LOTS as lot}
                <button
                  class="lot"
                  type="button"
                  disabled={!canBuy(plant.id, lot)}
                  on:click={() => dispatch({ type: 'BuySupply', plant: plant.id, amount: lot })}
                >
                  ×{lot}<span class="dim mono">{unit * lot} ₭</span>
                </button>
              {/each}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if remaining === 0}
      <p class="tiny dim spent-note">{FR.supply.quotaSpent}</p>
    {/if}
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .head {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .head .tiny {
    flex: 1;
  }

  .quota {
    color: var(--supply);
    white-space: nowrap;
  }

  .quota.spent {
    color: var(--text-dim);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    padding: 0 6px 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-dim);
    text-align: left;
    border-bottom: 1px solid var(--line);
  }

  td {
    padding: 5px 6px;
    font-size: 12px;
    border-bottom: 1px solid color-mix(in oklab, var(--line) 50%, transparent);
  }

  .num {
    text-align: right;
  }

  .lots {
    display: flex;
    gap: 4px;
    justify-content: flex-end;
  }

  .lot {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    padding: 2px 8px;
    font-size: 11px;
    border: 1px solid var(--line);
    border-radius: 10px;
    white-space: nowrap;
  }

  .lot:hover:not(:disabled) {
    border-color: var(--supply);
    background: var(--bg-2);
  }

  .spent-note {
    padding-top: 2px;
  }
</style>
