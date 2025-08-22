# Context Management Commands

## /update-context

**Purpose**: Updates the session context with current progress and state

**What it does**:
- Reviews current todo list status
- Updates implementation progress
- Records recent decisions and solutions
- Updates file structure changes
- Notes any issues resolved or encountered
- Updates next steps and priorities

**Usage**: Type `/update-context` in chat

---

## /load-context

**Purpose**: Loads complete session context to restore full understanding

**What it does**:
- Reads `context/session-context.md`
- Restores understanding of:
  - Project goals and architecture
  - What has been implemented
  - Current status and progress
  - File structure and key decisions
  - Known issues and solutions
  - Next steps and priorities

**Usage**: Type `/load-context` in chat

---

## Context File Location
`context/session-context.md` - Main session context file

## Benefits
- ✅ Maintains continuity across sessions
- ✅ Prevents losing implementation context
- ✅ Enables quick project state restoration
- ✅ Tracks architectural decisions and reasoning
- ✅ Documents solutions to technical challenges