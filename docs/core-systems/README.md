# Core Systems Quick Reference

## Directory Organization

**[pipeline/](pipeline/)** - Pipeline execution system
- [pipeline-coordinator.md](pipeline/pipeline-coordinator.md) ⭐ 9-step execution flow
- [pipeline-patterns.md](pipeline/pipeline-patterns.md) ⭐ Implementation patterns  
- [pipeline-implementation-guide.md](pipeline/pipeline-implementation-guide.md) - Developer quick start
- [pipeline-advanced-features.md](pipeline/pipeline-advanced-features.md) - Custom components, reroll
- [ROLL_FLOW.md](pipeline/ROLL_FLOW.md) - Roll execution details

**[checks/](checks/)** - Check execution & outcomes
- [check-card.md](checks/check-card.md) ⭐ Universal check card UI & interaction patterns

**[effects/](effects/)** - Resource & game effects
- [typed-modifiers-system.md](effects/typed-modifiers-system.md) - Resource modifications
- [game-commands-system.md](effects/game-commands-system.md) - Non-resource effects

**[phases/](phases/)** - Turn & phase management
- [turn-and-phase-system.md](phases/turn-and-phase-system.md) - Turn progression
- [phase-controllers.md](phases/phase-controllers.md) - Phase implementation patterns

**[services/](services/)** - Core services
- [skill-service.md](services/skill-service.md) - PF2e skill service
- [SERVICE_CONTRACTS.md](services/SERVICE_CONTRACTS.md) - Service responsibilities

---

## Quick Navigation by Task

**Implementing new action/event?**
→ [pipeline/pipeline-implementation-guide.md](pipeline/pipeline-implementation-guide.md) (quick start)  
→ [pipeline/pipeline-patterns.md](pipeline/pipeline-patterns.md) (pattern reference)

**Understanding execution flow?**
→ [pipeline/pipeline-coordinator.md](pipeline/pipeline-coordinator.md)

**Need custom components or reroll?**
→ [pipeline/pipeline-advanced-features.md](pipeline/pipeline-advanced-features.md)

**Debugging roll issues?**
→ [pipeline/ROLL_FLOW.md](pipeline/ROLL_FLOW.md)

**Working with outcomes?**
→ [checks/check-card.md](checks/check-card.md)

**Modifying resources?**
→ [effects/typed-modifiers-system.md](effects/typed-modifiers-system.md)

**Understanding phases?**
→ [phases/turn-and-phase-system.md](phases/turn-and-phase-system.md)

**Testing changes?**
→ [../guides/testing-guide.md](../guides/testing-guide.md)

**Debugging issues?**
→ [../guides/debugging-guide.md](../guides/debugging-guide.md)

---

## Related Documentation

- **Complete architecture:** [../ARCHITECTURE.md](../ARCHITECTURE.md)
- **Build system:** [../BUILD_SYSTEM.md](../BUILD_SYSTEM.md)
- **All documentation:** [../README.md](../README.md)

**⭐ = Most frequently referenced**
