<script lang="ts">
  /**
   * Plantes en SVG généré (docs/12 §7) : un dessin de base × 4 stades de
   * croissance × recoloration par template — 16 rendus pour 5 dessins réels.
   */
  import type { PlantId } from '../../../data/schema';

  export let plant: PlantId;
  /** 0 = semis, 1 = pousse, 2 = mature, 3 = prête à récolter. */
  export let stage: 0 | 1 | 2 | 3 = 0;
  export let size = 44;
  /** Parcelle vide : seule la terre est dessinée. */
  export let bare = false;

  const FOLIAGE: Record<PlantId, string> = {
    medicinal: 'var(--farm)',
    industrial: 'var(--lab-steel)',
    recreational: 'var(--broker)',
    toxic: 'var(--corrupt)',
  };

  $: leaf = FOLIAGE[plant];
  // hauteur de tige par stade, depuis la ligne de terre (y = 36)
  $: top = [27, 20, 12, 8][stage];
</script>

<svg class="plant" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <!-- butte de terre -->
  <path d="M5 40c4-6 10-8 19-8s15 2 19 8z" fill="var(--farm-soil)" />
  <path d="M3 40h42" stroke="var(--farm-soil)" stroke-width="3" stroke-linecap="round" />
  <path d="M12 37.5h6M27 36.5h7" stroke="var(--bg-0)" stroke-width="1.2" stroke-linecap="round" opacity="0.35" />

  {#if !bare}
    <!-- tige -->
    <path
      d={`M24 36V${top}`}
      stroke={leaf}
      stroke-width={stage === 0 ? 2 : 2.8}
      stroke-linecap="round"
    />

    {#if stage === 0}
      <!-- semis : deux cotylédons bien lisibles -->
      <path d="M24 28c-4.5-1-6-3.5-5.5-6 3 .3 5 2.2 5.5 6z" fill={leaf} />
      <path d="M24 28c4.5-1 6-3.5 5.5-6-3 .3-5 2.2-5.5 6z" fill={leaf} />
    {:else}
      <path d={`M24 ${top + 9}c-7-1.5-9.5-5-8.5-9.5 5 .5 8 3.5 8.5 9.5z`} fill={leaf} opacity="0.9" />
      {#if stage >= 2}
        <path d={`M24 ${top + 4}c7-1.5 9.5-5 8.5-9.5-5 .5-8 3.5-8.5 9.5z`} fill={leaf} opacity="0.9" />
      {/if}
    {/if}

    <!-- stade 3 : le détail de silhouette qui identifie le template -->
    {#if stage === 3}
      {#if plant === 'medicinal'}
        <circle cx="24" cy="7" r="4.5" fill="var(--ok)" />
        <circle cx="24" cy="7" r="1.8" fill="var(--bg-0)" />
      {:else if plant === 'industrial'}
        <rect x="20.5" y="3" width="7" height="8" rx="1.5" fill={leaf} />
        <path d="M22 3V1M26 3V1" stroke={leaf} stroke-width="1.8" stroke-linecap="round" />
      {:else if plant === 'recreational'}
        <path d="M24 2l5.5 9h-11z" fill="var(--broker)" />
      {:else}
        <path d="M24 2.5l5.5 5.5L24 13.5 18.5 8z" fill="var(--corrupt)" />
        <circle cx="24" cy="8" r="1.7" fill="var(--bg-0)" />
      {/if}
    {/if}
  {/if}
</svg>

<style>
  .plant {
    display: block;
  }
</style>
