# Core Systems Quick Reference

## Directory Organization

**[pipeline/](pipeline/)** - Pipeline execution system
- [pipeline-coordinator.md](pipeline/pipeline-coordinator.md) ⭐ 9-step execution flow
- [pipeline-patterns.md](pipeline/pipeline-patterns.md) ⭐ Implementation patterns
- [ROLL_FLOW.md](pipeline/ROLL_FLOW.md) - Complete roll execution flow

**[checks/](checks/)** - Check execution & outcomes
- [outcome-display-system.md](checks/outcome-display-system.md) ⭐ Result rendering
- [check-type-differences.md](checks/check-type-differences.md) - Events vs Incidents vs Actions
- [events-and-incidents-system.md](checks/events-and-incidents-system.md) - Random events
- [apply-button-validation.md](checks/apply-button-validation.md) - Result validation

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

**Implementing action?**
→ [pipeline/pipeline-patterns.md](pipeline/pipeline-patterns.md)

**Understanding execution flow?**
→ [pipeline/pipeline-coordinator.md](pipeline/pipeline-coordinator.md)

**Debugging roll issues?**
→ [pipeline/ROLL_FLOW.md](pipeline/ROLL_FLOW.md)

**Working with outcomes?**
→ [checks/outcome-display-system.md](checks/outcome-display-system.md)

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
