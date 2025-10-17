<script lang="ts">
   import type { Settlement } from '../../../../models/Settlement';
   
   export let settlement: Settlement;
</script>

<!-- This component previously contained the upgrade settlement UI -->
<!-- That functionality has been moved to: -->
<!-- - Structure progress indicator in SettlementStatus.svelte -->
<!-- - Direct level editing in the settlement header -->
<!-- - Upgrade Settlement action on the Actions tab -->
