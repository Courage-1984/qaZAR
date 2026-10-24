# **Agentic Governance Refactoring Protocol**

Here is the **comprehensive, universal tree directory structure** that encompasses all(Cursor, Claude Code, Antigravity) of these platforms, handles legacy files, and enforces stack-agnostic best practices.

### **1\. Comprehensive Universal Directory Structure**

.  
├── AGENTS.md                          \# Universal baseline context (cross-platform standard)  
├── CLAUDE.md                          \# Claude root context (must import @AGENTS.md)  
├── .claudeignore                      \# Excludes files from Claude Code's context window  
├── .cursorignore                      \# Excludes files from Cursor's indexing  
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
│  
├── .cursor/                           \# Cursor IDE Specific Configuration  
│   ├── mcp.json                       \# Cursor-specific MCP server configurations  
│   ├── rules/                         \# Modular Context Rules (.mdc format)  
│   └── skills/                        \# Cursor MCP-delegated tools and capabilities  
│  
└── 🗑️ Legacy / Deprecated (To Be Migrated/Deleted by Agent)  
    ├── .cursorrules                   \# \-\> Migrate to .cursor/rules/\*.mdc  
    ├── GEMINI.md                      \# \-\> Migrate to AGENTS.md  
    ├── .claude/commands/              \# \-\> Migrate to .claude/skills/  
    └── .cursor/rules/cursorrules.mdc  \# \-\> Split into modular semantic .mdc files

###  **2\. Complete Descriptions & Instructions**

To make this architecture work without conflicts, you must understand how precedence and file types differ across the ecosystem.

#### **Root & Universal Standards**

* AGENTS.md: The universal source of truth supported by over 30+ tools. It provides "always-on" context that guides the agent's behavior across every session. Keep it under 150 lines.  
* CLAUDE.md: Claude Code’s specific entry point. Place @AGENTS.md at the very top of this file so both tools stay in sync.  
* .cursorignore **&** .claudeignore: Critical for managing context bloat. Use these to hide build artifacts, large logs, or complex media folders so agents don't waste tokens trying to index them.  
* .mcp.json: A global fallback file for Model Context Protocol server definitions if a tool-specific configuration is absent.

#### **The** .agents/ **Standard (Antigravity & Open Ecosystem)**

Google Antigravity and other open-source frameworks (like Microsoft APM) are shifting toward this shared directory to avoid vendor lock-in.

* .agents/mcp\_config.json: Defines universal MCP servers. Antigravity CLI binds directly to this file for tool execution.  
* .agents/hooks.json **&** .agents/hooks/: Defines cross-platform lifecycle hooks (such as PreInvocation and PostToolUse) evaluated at runtime by engines like Antigravity.  
* **Skills vs. Prompts vs. Rules**: skills/ define executable workflows, prompts/ store system templates, and rules/ enforce domain constraints universally.

#### **Cursor Ecosystem (**.cursor/**)**

* .cursor/rules/\*.mdc: Cursor has deprecated the root .cursorrules file. Rules now live here as modular .mdc files. They use frontmatter (like alwaysApply or globs) to conditionally inject context, saving token costs.  
* .cursor/skills/: Defines specialised tools that Cursor's Orchestrator agent can delegate tasks to.  
* .cursor/mcp.json: Registers MCP servers explicitly for Cursor's internal agent usage.

#### **Claude Code Ecosystem (**.claude/**)**

* .claude/skills/: Replaces the legacy .claude/commands/. This folder contains SKILL.md files that bundle repeatable workflows and custom slash commands. Skills are agnostic—they tell Claude *how* to do something, but have no persona.  
* .claude/agents/: Defines subagents. Unlike skills, subagents have an isolated persona, specific tool permissions, and their own context window (e.g., a "security auditor" agent).  
* .claude/settings.json **vs** .claude/settings.local.json: settings.json is checked into version control to enforce team guardrails (e.g., hooks). settings.local.json is for developer-specific overrides and MUST be gitignored.  
* .claude/worktrees/: Managed by Claude to execute background subtasks in isolated Git branches without disrupting your active working directory.

### **3\. Google Doc Content: Refactoring & Optimisation Protocol**

*Since I cannot directly publish to your Google Drive from this environment, please copy and paste the block below into a new Google Doc titled **"Universal Agentic Governance Refactoring Protocol"**. You can feed this document to any agent to have it automatically rebuild your repository.*

**(Copy below this line into Google Docs)**

# **Universal Agentic Governance: Refactoring & Optimisation Protocol**

# 

# **1\. Agent System Directive (Read First)**

**System Prompt for Processing Agent:** You are an Agentic Dev Governance auditor. Your objective is to refactor the governance structure of the repository you are currently operating in to enforce a universal, zero-bloat architecture that cleanly supports Cursor, Claude Code, Google Antigravity, and the emerging open .agents/ standard.

* **Audit & Prune (Legacy Cleanup):** Scan the root and hidden directories for legacy files. Delete .cursorrules, GEMINI.md, and monolith .cursor/rules/cursorrules.mdc files. Migrate their useful contents into modular .cursor/rules/\*.mdc files or the root AGENTS.md. Migrate legacy .claude/commands/\*.md files into the modern .claude/skills/ structure (using SKILL.md).  
* **Isolate Secrets:** Ensure .claude/settings.local.json is explicitly added to .gitignore. Do not ever commit local API keys, MCP connection strings, or debug flags.  
* **Unify Context:** Consolidate universal project constraints (stack limits, English dialects, build commands) into a single AGENTS.md file kept strictly under 150 lines. Ensure CLAUDE.md starts with @AGENTS.md.  
* **Agnostic Execution:** Do not assume a specific frontend framework or tech stack unless explicitly dictated by the repository's native codebase. The governance structure must remain stack-agnostic and universally applicable.

##  

## **2\. Universal Directory Structure Target**

*Agent: Ensure the repository matches this exact folder and file topology.*  
*.*  
*├── AGENTS.md                          \# Universal baseline context*  
*├── CLAUDE.md                          \# Claude root context (must import @AGENTS.md)*  
*├── .claudeignore                      \# Excludes files from Claude Code*  
*├── .cursorignore                      \# Excludes files from Cursor*  
*├── .mcp.json                          \# Global/root fallback MCP config*  
*│*  
*├── .agents/                           \# Universal Ecosystem Standard*  
*│   ├── mcp\_config.json*                  
*│   ├── hooks.json*                       
*│   ├── rules/*                           
*│   ├── skills/*                          
*│   ├── workflows/*                       
*│   ├── prompts/*                         
*│   └── hooks/*                           
*│*  
*├── .claude/                           \# Claude Code Specific Configuration*  
*│   ├── settings.json*                    
*│   ├── settings.local.json            \# MUST BE GITIGNORED*  
*│   ├── agents/*                          
*│   ├── skills/*                          
*│   ├── hooks/*                           
*│   ├── workflows/*                       
*│   └── worktrees/*                       
*│*  
*└── .cursor/                           \# Cursor Specific Configuration*  
    *├── mcp.json*                         
    *├── rules/*                           
    *└── skills/*

##  **3\. Execution Rules for Refactoring**

1. **Context Efficiency:** If you find redundant architecture explanations that you (the LLM) can deduce natively by scanning the codebase, delete them from the rules files.  
2. **Modular Cursor Rules:** When migrating legacy rules to .cursor/rules/\*.mdc, use explicit globs in the frontmatter so rules only trigger when specific file types are edited.  
3. **Claude Code Alignment:** Ensure all workflows inside .claude/ are split correctly: use .claude/skills/ for reusable procedures, and .claude/agents/ strictly for isolated personas.

**(Copy above this line into Google Docs)**

—-

**TL;DR:** LLM-generated context files degrade agent performance by 0.5–2%. These files concurrently inflate token burn and inference costs by 20–23%. To prevent context bloat and hallucination, engineering teams are shifting to human-crafted, ultra-lean rule files. The industry standard is a dual-layer governance architecture combining a universal AGENTS.md file with modular, tool-specific configuration wrappers.

Below is the comprehensive content formatted for you to copy directly into a Google Doc.

## **Universal Agentic Governance Directory Structure**

This architecture leverages a universal baseline while isolating tool-specific execution mechanics to ensure strict context assembly and boundary control.

Plaintext  
.  
├── AGENTS.md                          \# Universal baseline context (\<150 lines)  
├── CLAUDE.md                          \# Claude root context (must import @AGENTS.md)  
├── .claudeignore                      \# Excludes files from Claude Code  
├── .cursorignore                      \# Excludes files from Cursor  
├── .mcp.json                          \# Global/root fallback MCP config  
│  
├── .agents/                           \# Universal Ecosystem Standard (Antigravity)  
│   ├── mcp\_config.json                  
│   ├── hooks.json                       
│   ├── rules/                           
│   ├── skills/                          
│   ├── workflows/                       
│   ├── prompts/                         
│   └── hooks/                           
│  
├── .claude/                           \# Claude Code Specific Configuration  
│   ├── settings.json                    
│   ├── settings.local.json            \# MUST BE GITIGNORED  
│   ├── agents/                          
│   ├── skills/                          
│   ├── hooks/                           
│   ├── workflows/                       
│   └── worktrees/                       
│  
└── .cursor/                           \# Cursor Specific Configuration  
    ├── mcp.json                         
    ├── rules/                           
    └── skills/                      
    

## **Dual-Layer Governance Architecture**

A single governance file cannot handle diverse tool-specific mechanics. The dual-layer model maintains non-discoverable project constraints universally, while delegating tool routing and sandbox hooks to specific platforms.

| Platform | Location & Scope | Core Mechanics & Configuration Strategies |
| :---- | :---- | :---- |
| **Universal (AAIF)** | AGENTS.md (Project root) | Defines universal project invariants, build commands, and architectural boundaries. Must be kept under 150 lines to minimise context tax.  |
| **Cursor IDE** | .cursor/rules/\*.mdc (Project scope) | Deprecates monolithic .cursorrules in favour of modular, trigger-based .mdc files. Uses YAML frontmatter (globs, alwaysApply) to map rules strictly to specific file patterns.  |
| **Claude Code** | CLAUDE.md & .claude/ (Workspace scope) | CLAUDE.md must import @AGENTS.md at the very top. The .claude/settings.json file enforces zero-trust execution and network boundaries.  |
| **Google Antigravity** | .agents/ or .antigravity/ (Project root) | Manages local parallel execution and visual artifact verification. Relies on .agents/rules/ for always-on guidelines and .agents/workflows/ for multi-step orchestration.  |

## **Universal Agentic Governance: Refactoring & Optimisation Protocol**

*Provide the following section directly to an AI agent to execute automated repository refactoring.*

**System Prompt for Processing Agent:** You are an Agentic Dev Governance auditor. Your objective is to refactor the governance structure of the repository you are currently operating in to enforce a universal, zero-bloat architecture. This architecture cleanly supports Cursor, Claude Code, Google Antigravity, and the emerging open .agents/ standard.

* **Audit & Prune (Legacy Cleanup):** Scan the root and hidden directories for legacy files. Delete .cursorrules, GEMINI.md, and monolith .cursor/rules/cursorrules.mdc files.  
*   
* **Modularise Cursor Rules:** Migrate legacy instructions into domain-specific .mdc files with explicit globs or alwaysApply: false frontmatter to reduce token overhead.  
*   
* **Modernise Claude Code:** Migrate legacy .claude/commands/\*.md files into the modern .claude/skills/ structure using SKILL.md.  
*   
* **Isolate Secrets:** Ensure .claude/settings.local.json is explicitly added to .gitignore. Do not ever commit local API keys, MCP connection strings, or debug flags.  
*   
* **Unify Context:** Consolidate universal project constraints into a single AGENTS.md file kept strictly under 150 lines. Ensure CLAUDE.md starts with @AGENTS.md.  
*   
* **Agnostic Execution:** Do not assume a specific frontend framework or tech stack unless explicitly dictated by the repository's native codebase.  
*   
* **Context Efficiency:** If you find redundant architecture explanations that you can deduce natively by scanning the codebase, delete them from the rules files.  
* 

Would you like me to draft a foundational set of .mdc files tailored for a strict, minimalist tech stack?

