<script lang="ts">
  /**
   * AdjustmentBadges - Renders EventModifier[] as badges
   *
   * Converts modifiers to UnifiedOutcomeBadge format using the shared
   * convertModifiersToBadges utility, then renders with SimpleOutcomeBadges.
   */
  import type { EventModifier } from '../../../types/modifiers';
  import { convertModifiersToBadges } from '../../../pipelines/shared/convertModifiersToBadges';
  import SimpleOutcomeBadges from './SimpleOutcomeBadges.svelte';

  export let modifiers: EventModifier[];

  // Convert modifiers to unified badge format
  $: badges = modifiers ? convertModifiersToBadges(modifiers) : [];
</script>

<SimpleOutcomeBadges {badges} />
