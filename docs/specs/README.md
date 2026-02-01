# Project Specifications

This directory contains project-specific specifications.

## Structure

```
docs/specs/
├── constitution.md     # Project principles (customize this)
├── features/           # Feature specifications
│   └── feature-name.md
├── plans/              # Implementation plans
│   └── plan-name.md
└── tasks/              # Task breakdowns
    └── tasks-name.md
```

## Templates

Spec templates are in the ai-standards sidecar:
- `.ai-standards/.specify/spec-template.md`
- `.ai-standards/.specify/plan-template.md`
- `.ai-standards/.specify/tasks-template.md`

## Creating Specs

Use the `/speckit.*` commands in your AI assistant:

```
/speckit.specify <description>   # Creates a feature spec
/speckit.plan <tech choices>     # Creates an implementation plan
/speckit.tasks                   # Breaks plan into tasks
```

Specs should be saved here in `docs/specs/`, not in the sidecar.
