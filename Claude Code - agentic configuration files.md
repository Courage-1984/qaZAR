# Claude Code \- agentic configuration files

**TL;DR:** These are collectively known as **AI context files**, **agent instructions**, or **AI coding rules** (often referred to as **agent scaffolding** or **agentic configuration files**).

They serve as persistent, repository-level guidelines and definitions that direct coding agents (like Claude Code, Cursor, Copilot Workspace, Codex, or custom agent frameworks) on how to understand, build, and interact with a specific codebase.

# **Agentic Governance Refactoring Protocol**

Here is the **comprehensive, universal tree directory structure** that handles legacy files, and enforces stack-agnostic best practices.

### **1\. Comprehensive Universal Directory Structure**

.  
├── AGENTS.md                          \# Universal baseline context (cross-platform standard)  
├── CLAUDE.md                          \# Claude root context (must import @AGENTS.md)  
├── .claudeignore                      \# Excludes files from Claude Code's context window  
├── .mcp.json                          \# Global/root fallback MCP configuration  
│  
├── .agents/                           \# Universal AAIF/Ecosystem Standard Directory  
│   ├── mcp\_config.json                \# Standardised MCP server bindings (used by Antigravity)  
│   ├── hooks.json                     \# Cross-platform lifecycle hooks (PreInvocation, PostToolUse)  
│   ├── rules/                         \# Universal cross-agent domain rules  
│   ├── skills/                        \# Agnostic tools/functions (without personas)  
│   ├── workflows/                     \# Cross-agent sequence/task orchestration  
│   ├── prompts/                       \# Reusable sub-agent prompts / system templates  
│   └── hooks/                         \# Executable hook scripts  
│  
├── .claude/                           \# Claude Code Specific Configuration  
│   ├── settings.json                  \# Checked-in workspace settings (strictAllowlist)  
│   ├── settings.local.json            \# GITIGNORED local overrides (API keys, debug)  
│   ├── agents/                        \# Subagents: Isolated personas with own context windows  
│   ├── skills/                        \# Repeatable workflows and slash commands (replaces commands/)  
│   ├── hooks/                         \# Claude-specific automated guardrails  
│   ├── workflows/                     \# Automated sequence definitions  
│   └── worktrees/                     \# Isolated Git worktrees for background tasks

### **2\. Complete Descriptions & Instructions**

To make this architecture work without conflicts, you must understand how precedence and file types differ across the ecosystem.

#### **Root & Universal Standards**

* AGENTS.md: The universal source of truth supported by over 30+ tools. It provides "always-on" context that guides the agent's behavior across every session. Keep it under 150 lines.  
* CLAUDE.md: Claude Code’s specific entry point. Place @AGENTS.md at the very top of this file so both tools stay in sync.  
* .claudeignore: Critical for managing context bloat. Use these to hide build artifacts, large logs, or complex media folders so agents don't waste tokens trying to index them.  
* .mcp.json: A global fallback file for Model Context Protocol server definitions if a tool-specific configuration is absent.

#### **The** .agents/ **Standard (Antigravity & Open Ecosystem)**

Google Antigravity and other open-source frameworks (like Microsoft APM) are shifting toward this shared directory to avoid vendor lock-in.

* .agents/mcp\_config.json: Defines universal MCP servers. Antigravity CLI binds directly to this file for tool execution.  
* .agents/hooks.json **&** .agents/hooks/: Defines cross-platform lifecycle hooks (such as PreInvocation and PostToolUse) evaluated at runtime by engines like Antigravity.  
* **Skills vs. Prompts vs. Rules**: skills/ define executable workflows, prompts/ store system templates, and rules/ enforce domain constraints universally.

#### **Claude Code Ecosystem (**.claude/**)**

* .claude/skills/: Replaces the legacy .claude/commands/. This folder contains SKILL.md files that bundle repeatable workflows and custom slash commands. Skills are agnostic—they tell Claude *how* to do something, but have no persona.  
* .claude/agents/: Defines subagents. Unlike skills, subagents have an isolated persona, specific tool permissions, and their own context window (e.g., a "security auditor" agent).  
* .claude/settings.json **vs** .claude/settings.local.json: settings.json is checked into version control to enforce team guardrails (e.g., hooks). settings.local.json is for developer-specific overrides and MUST be gitignored.  
* .claude/worktrees/: Managed by Claude to execute background subtasks in isolated Git branches without disrupting your active working directory.

**PROMPT:**

### **Claude Code Scaffolding Prompt**

**Role:** You are an expert repository architect and AI configuration manager.

**Task:** Audit this codebase and implement the Agentic Governance Refactoring Protocol scaffolding.

**Execution Steps:**

1. **Audit:** Review the root directory for any existing AI context files (e.g., CLAUDE.md, AGENTS.md). If the legacy .claude/commands/ folder exists, migrate its contents to .claude/skills/.  
2. **Root Files Scaffolding:** Create or update the following files:

   * AGENTS.md: Establish this as the universal baseline context and keep it under 150 lines.  
   *   
   * CLAUDE.md: Set this as the Claude root context and ensure it imports @AGENTS.md at the very top.  
   *   
   * .claudeignore: Create this to exclude build artefacts, large logs, or complex media folders.  
   *   
   * .mcp.json: Create a global fallback file for Model Context Protocol server definitions.  
   *   
3. **Universal Directory (**.agents/**):** Create the .agents/ directory. Inside it, generate:  
   * mcp\_config.json: For standardised MCP server bindings.  
   *   
   * hooks.json: For cross-platform lifecycle hooks.  
   *   
   * Empty subdirectories: rules/, skills/, workflows/, prompts/, and hooks/.  
   *   
4. **Claude Specific Directory (**.claude/**):** Create the .claude/ directory. Inside it, generate:  
   * settings.json: For checked-in workspace settings.  
   *   
   * settings.local.json: For developer-specific overrides.  
   *   
   * Empty subdirectories: agents/, skills/, hooks/, workflows/, and worktrees/.  
5. **Version Control Guardrails:** Update the repository's .gitignore to explicitly ignore .claude/settings.local.json.

### 

### **Reasoning & Implementation Advice**

This prompt explicitly directs your agent to handle directory creation while respecting the precedence and file types across the ecosystem. By forcing the agent to audit first, you prevent it from blindly overwriting any existing custom rules you might have already established.

The distinction between .claude/skills/ (repeatable workflows that dictate *how* to do something) and .claude/agents/ (isolated personas with specific tool permissions and context windows) is strictly maintained to ensure your environment remains clean and stack-agnostic. Furthermore, requesting the immediate creation of a .claudeignore file intercepts context bloat, ensuring the agent does not waste valuable tokens indexing irrelevant folders during future development sessions.

*(Note: Claude is highly context-aware and will process the prompt flawlessly even if you leave the* \[cite: 1\] *reference tags in the text).*

Would you like me to draft the baseline system rules to populate inside your .agents/rules/ directory once this initial scaffolding is complete?

