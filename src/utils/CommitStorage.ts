/**
 * CommitStorage - Client-side storage for pending commit functions
 * 
 * Functions cannot be serialized in Foundry actor flags, so we store them
 * separately in memory on each client. The instance only stores a reference ID.
 */

type CommitFunction = () => Promise<void>;

class CommitStorage {
  private commits: Map<string, CommitFunction[]> = new Map();
  
  /**
   * Store commits for an instance (client-side only)
   */
  store(instanceId: string, commits: CommitFunction[]): void {
    this.commits.set(instanceId, commits);
    console.log(`💾 [CommitStorage] Stored ${commits.length} commit(s) for instance ${instanceId}`);
  }
  
  /**
   * Get commits for an instance
   */
  get(instanceId: string): CommitFunction[] | undefined {
    return this.commits.get(instanceId);
  }
  
  /**
   * Remove commits for an instance
   */
  remove(instanceId: string): void {
    this.commits.delete(instanceId);
    console.log(`🗑️ [CommitStorage] Removed commits for instance ${instanceId}`);
  }
  
  /**
   * Clear all commits (e.g., on phase change)
   */
  clear(): void {
    this.commits.clear();
    console.log('🗑️ [CommitStorage] Cleared all commits');
  }
}

// Export singleton
export const commitStorage = new CommitStorage();
