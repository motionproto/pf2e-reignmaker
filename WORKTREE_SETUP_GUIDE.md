# Git Worktrees Setup Guide for pf2e-reignmaker

## Current Setup

You now have two working directories for the same repository:

1. **Primary Directory** (Editor 1)
   - Path: `/Users/mark/Documents/repos/pf2e-reignmaker`
   - Branch: `actionbranch`
   - Purpose: Your current work on actions/pipelines

2. **Secondary Directory** (Editor 2)
   - Path: `/Users/mark/Documents/repos/pf2e-reignmaker-editor2`
   - Branch: `editor2-branch`
   - Purpose: Second developer's work or parallel development

## How to Use Both Worktrees

### For Editor 1 (Current Directory)
```bash
# Continue working as normal
cd /Users/mark/Documents/repos/pf2e-reignmaker
# You're on actionbranch
git add .
git commit -m "your changes"
git push origin actionbranch
```

### For Editor 2 (New Worktree)
```bash
# Open in a new VS Code window
cd /Users/mark/Documents/repos/pf2e-reignmaker-editor2
# You're on editor2-branch
git add .
git commit -m "editor 2 changes"
git push origin editor2-branch
```

## Opening in VS Code

### Option 1: Two VS Code Windows
```bash
# Terminal 1
cd /Users/mark/Documents/repos/pf2e-reignmaker
code .

# Terminal 2
cd /Users/mark/Documents/repos/pf2e-reignmaker-editor2
code .
```

### Option 2: VS Code Workspaces
Create a workspace file to open both directories in one VS Code window with separate workspace folders.

## Development Workflow

### 1. Install Dependencies in Both Worktrees
Both worktrees need their own node_modules:
```bash
# In editor2 directory
cd /Users/mark/Documents/repos/pf2e-reignmaker-editor2
npm install
```

### 2. Run Development Server
Each worktree can run its own development server on different ports:
```bash
# Editor 1 (default port)
npm run dev

# Editor 2 (you may need to modify vite.config.dev.ts to use a different port)
npm run dev -- --port 30002
```

### 3. Syncing Changes Between Branches

#### Getting Updates from the Other Branch
```bash
# In editor1 (actionbranch) to get editor2's changes
git fetch origin
git merge origin/editor2-branch  # or cherry-pick specific commits

# In editor2 to get actionbranch changes
git fetch origin
git merge origin/actionbranch
```

#### Regular Sync Points
```bash
# Daily sync example
git fetch origin
git log --oneline origin/actionbranch..HEAD  # See what editor2 has that actionbranch doesn't
git log --oneline HEAD..origin/actionbranch  # See what actionbranch has that editor2 doesn't
```

## Best Practices for Parallel Development

### 1. Divide Work by Domain
- **Editor 1 (actionbranch)**: Focus on pipelines and actions
  - `/src/pipelines/actions/`
  - `/src/controllers/actions/`
  - `/src/services/PipelineCoordinator.ts`

- **Editor 2 (editor2-branch)**: Focus on UI/UX
  - `/src/view/`
  - `/src/styles/`
  - `/src/stores/`

### 2. Communication Strategy
- **Before starting work**: Check what files the other person is working on
- **Regular commits**: Commit and push frequently (at least daily)
- **Clear commit messages**: Use descriptive messages indicating what was changed

### 3. Handling Merge Conflicts
```bash
# If conflicts arise during merge
git merge origin/other-branch
# Fix conflicts in VS Code (it has excellent merge conflict resolution tools)
git add .
git commit
```

### 4. Clean Up When Done
When you're finished with the second worktree:
```bash
# Remove the worktree
git worktree remove /Users/mark/Documents/repos/pf2e-reignmaker-editor2

# Or if you want to keep the branch but remove the worktree
git worktree remove --force /Users/mark/Documents/repos/pf2e-reignmaker-editor2
```

## Quick Reference Commands

```bash
# List all worktrees
git worktree list

# Add another worktree
git worktree add ../pf2e-reignmaker-feature3 -b feature3-branch

# Remove a worktree
git worktree remove ../pf2e-reignmaker-editor2

# Prune worktree information (cleanup)
git worktree prune
```

## Troubleshooting

### If npm install fails in the new worktree
The symlink to __foundryModules should work, but if there are issues:
```bash
cd /Users/mark/Documents/repos/pf2e-reignmaker-editor2
rm __foundryModules
ln -s "/Users/mark/Library/Application Support/FoundryVTT/Data/modules" __foundryModules
```

### If the branches diverge too much
Consider creating a temporary integration branch:
```bash
git checkout -b integration
git merge actionbranch
git merge editor2-branch
# Resolve any conflicts
git push origin integration
```

## Next Steps

1. Open the second worktree in a new VS Code window
2. Run `npm install` in the second worktree
3. Start developing! Each editor can work independently
4. Commit and push changes regularly
5. Merge branches when features are complete
