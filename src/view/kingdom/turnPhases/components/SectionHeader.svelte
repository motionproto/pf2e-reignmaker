<script lang="ts">
  /**
   * SectionHeader - Reusable section header component
   * 
   * Displays an icon and label for major sections like "Uphold Stability", "Military Operations", etc.
   * Does not include the description/tagline - that's a separate element.
   */
  export let icon: string;
  export let name: string;
</script>

<div class="section-header">
  <i class="fas {icon} section-icon"></i>
  <h3 class="section-name">{name}</h3>
</div>

<style lang="scss">
  .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-12);

    .section-icon {
      font-size: var(--font-4xl);
      color: var(--color-amber);
      flex-shrink: 0;
    }

    .section-name {
      margin: 0;
      font-size: var(--font-4xl);
      font-weight: var(--font-weight-semibold);
      line-height: 1.3;
      color: var(--color-amber);
    }
  }
</style>
