<script lang="ts">
  /**
   * Décor de l'atelier, dessiné une fois derrière les stations.
   *
   * C'est un ancien atelier de facteur d'instruments reconverti (docs/07 §1) :
   * d'où l'établi en bois, le panneau à outils et les serre-joints au mur —
   * le bois et le verre cassent le gris uniforme de la partie productivité.
   */
  export let benchLeft = 0;
  export let benchWidth = 0;
</script>

<div class="backdrop" aria-hidden="true">
  <div class="wall"></div>
  <div class="light"></div>

  <!-- fenêtre à petits carreaux : la source de la lumière rasante -->
  <svg class="window" viewBox="0 0 96 70" aria-hidden="true">
    <!-- vitrage : la lumière du dehors passe par là -->
    <rect x="3" y="3" width="86" height="54" rx="1" fill="color-mix(in oklab, var(--glass) 16%, transparent)" />
    <g stroke="var(--lab-steel)" stroke-width="1.5" fill="none" opacity="0.6">
      <rect x="3" y="3" width="86" height="54" rx="1" />
      <path d="M46 3v54M3 30h86" />
    </g>
    <!-- appui de fenêtre -->
    <path d="M0 60h96" stroke="var(--lab-steel)" stroke-width="3" opacity="0.5" stroke-linecap="round" />
  </svg>

  <!-- panneau à outils, calé derrière l'établi -->
  {#if benchWidth > 0}
    <svg
      class="pegboard"
      style={`left:${benchLeft}px; width:${benchWidth}px`}
      viewBox="0 0 400 60"
      preserveAspectRatio="none"
    >
      <g stroke="var(--lab-steel)" stroke-width="1.4" fill="none" opacity="0.3" vector-effect="non-scaling-stroke">
        <!-- serre-joints et gabarits de lutherie restés au mur -->
        <path d="M46 14v30M36 14h20M36 44h20" />
        <path d="M104 16c10 0 10 30 0 30" />
        <path d="M162 14v34M152 24h20" />
        <path d="M220 16h26l-5 30h-16z" />
        <circle cx="300" cy="30" r="12" />
        <path d="M300 18v24M288 30h24" />
        <path d="M356 14v34M348 14h16" />
      </g>
    </svg>
  {/if}

  <div class="floor"></div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .wall {
    position: absolute;
    inset: 0;
    /* le mur descend jusqu'à la ligne de sol, le sol occupe le reste */
    background:
      linear-gradient(180deg, var(--wall-far) 0%, var(--wall) 60%),
      var(--floor);
    background-size: 100% var(--scene-h), 100% 100%;
    background-repeat: no-repeat;
  }

  /* lumière rasante venant de la fenêtre, à gauche */
  .light {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      42% 120% at 16% 0%,
      color-mix(in oklab, var(--lab) 12%, transparent) 0%,
      transparent 70%
    );
  }

  /* calée au-dessus des planches de culture : c'est elle qui les éclaire,
     et elle laisse l'étal du Fournisseur dans son coin d'ombre */
  .window {
    position: absolute;
    left: 148px;
    top: 22px;
    width: 96px;
    height: 70px;
  }

  .pegboard {
    position: absolute;
    top: 24px;
    height: 58px;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
    mask-image: linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent);
  }

  /* plinthe : sépare le mur du sol d'un trait net */
  .floor {
    position: absolute;
    left: 0;
    right: 0;
    top: var(--scene-h);
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--line) 8%, var(--line) 92%, transparent);
  }
</style>
