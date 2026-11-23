---
layout: post
title: "Taming Inkling 2 Mini: A Local Coding Agent That Ships a Game in 33 Minutes"
date: 2026-11-23 00:00:00 +0000
categories:
  - ai
  - programming
  - nerdstuff
---

After a long series of test runs, a 17.5 GB open-weight model on a 2021 laptop built a working 2048 game in 33 minutes. From a four-sentence prompt. With nobody touching the keyboard.

The comparable runs before it took 76 minutes or more, and two of them were abandoned unfinished.

This post is about what changed in between, and it ends with everything you need to rebuild the setup yourself. The short version: **instructions did almost nothing, mechanical enforcement did a lot, and the biggest single gain came from capping how long the model is allowed to think.**

---

## The Goal and the One Hard Rule

I wanted a local model that works as a real coding agent on the machine I already own: an M1 Max MacBook Pro with 32 GB. The test was simple. Give it a small but complete programming task and get a program that runs.

One requirement was not negotiable: **the prompt has to be something a normal user would write.** No prior knowledge, no second AI drafting it. An early attempt needed a long, expert-written restart prompt to get the model back on track, and I ruled that out as a solution. If a setup only works with prompt engineering, it does not work.

A second requirement followed quickly: the agent has to be autonomous. A two-step procedure where I plan first and then hand over the plan was also out.

---

## Why Inkling 2 Mini

[Inkling 2 Mini](https://thinkingmachines.ai/news/inkling-2-mini/) from Thinking Machines Lab came out on November 20, and three things made it the obvious candidate.

**The benchmarks.** The lab reports 48.2% on DeepSWE v1.1, against 42.2% for Qwen3.8-27B, and 79.2% on SWE-bench Verified. According to the announcement it leads every open-weights model under 100B total parameters on DeepSWE and on the Vals Index. For a model this size, those are coding-agent numbers, not chatbot numbers.

**The looping.** Inkling 2 Mini is a looped transformer. It stores 24 layers and runs the middle twelve three times for every token, so a token passes through 48 layer applications. It is also a mixture-of-experts model: 26.4B parameters in total, 3.4B active per token. You get the depth of a bigger network without paying for its weights.

**The size.** The whole thing fits in about 20 GB, and the lab says any Mac with at least 32 GB can run it. The 4-bit GGUF I use is 17.5 GB. On my M1 Max that gives 18.5 to 20 tokens per second.

The same announcement also lists two weaknesses, and both turned out to matter more than the benchmark table. The model scores only 33.4% on a benchmark for instructions with many constraints. And it almost never follows instructions about *how* to think: in the lab's own test it complied at most 0.1% of the time. Keep those two in mind. They explain most of this post.

---

## Why Pi

For the agent I picked [Pi](https://pi.dev), version 1.6.0, for two reasons.

**It is frugal with context.** With a 32,000-token window, every token of harness overhead is a token the model cannot use for code. The first request of my final run was 4,237 tokens in total, and that already included the system prompt, my rule file and eleven tool definitions.

**It is configurable all the way down.** A Pi extension is one TypeScript file. It can register new tools, block or rewrite tool calls, change tool results before the model sees them, and switch built-in tools off. Models, compaction and thinking format are plain JSON. Everything I describe below was possible without forking anything.

The 32,000-token context came out of probing the limits. It is the balance that worked on 32 GB of unified memory, where the weights alone already take 17.5 GB.

---

## The Setup

| Part | What I used |
| --- | --- |
| Model | Inkling 2 Mini, 4-bit GGUF `Q4_K_M`, 17.5 GB |
| Hardware | MacBook Pro M1 Max, 32 GB |
| Speed | 18.5 to 20 tokens per second |
| Agent | Pi coding agent 1.6.0 |
| Context window | 32,000 tokens |
| Server | LM Studio for the earlier runs, llama.cpp `llama-server` (build b12651) for the final one |

Every run used a fresh folder and a short task: a small desktop game as a Swift package with SwiftUI, plus a `--selftest` flag that checks the game rules without opening a window. The games were Four in a Row, Reversi and 2048.

I did not judge runs by impression. Each one was followed live through the server log or the Pi session file, with a script that counted rounds, output tokens, thinking tokens and tool calls. The project folder and its git history showed what was actually on disk.

Full disclosure: the harness described below was built together with Claude, which also read the logs during each run. That matters for the hard rule. The prompts stayed simple, but the harness itself was a one-time piece of engineering.

---

## What Did Not Work

**Rules in `AGENTS.md`.** The obvious first move was to write down how the agent should behave: build after every change, commit often, never delete files, fix errors in place. The model ignored most of it. Worse, a long rule list became material to ruminate on, and one run stalled while the model debated which rule applied. Remember the 33.4%.

**Trusting the model with its own code.** Inkling 2 Mini fixes a simple compiler error well when the code is small. On code it designed itself, its reflex after two or three failed builds was to rewrite the whole file, or to delete everything and start over. More than once it deleted the whole project.

**Exact-text edits.** Pi's built-in `edit` tool replaces a quoted passage. The model regularly quoted the passage slightly wrong, the edit failed, and the fallback was again a full rewrite.

**A shell.** I added a lock that blocked repeated full rewrites of the same file while the build was red. The model wrote the file through a Python one-liner in `bash` instead. A general-purpose shell makes every guard optional.

**The thinking-level setting.** Pi was set to `minimal` for many runs with no visible effect. The cause sat in the server: LM Studio mapped `minimal` to `low` before the chat template saw it, and treated a missing or `none` value as the template default, which is the highest effort. Setting Pi's thinking to `off` therefore produced the most thinking, not the least.

---

## The Harness: Enforce, Do Not Ask

Every rule that mattered moved out of the instructions and into a Pi extension, a single TypeScript file of about 450 lines. The model no longer has to remember to do the right thing, because the wrong thing is unavailable.

| Mechanism | What it does | Problem it removes |
| --- | --- | --- |
| Automatic build | Detects the stack and builds after every file change | The model forgetting to build |
| Compact errors | Returns at most six errors, each with file, line and the source line | Long compiler output that triggers rumination |
| Automatic commit | Commits every state, marked green or red | Lost work after a rewrite |
| Numbered reads | `read` returns line numbers | Guessing where a line is |
| `replace_lines` | Edits by line range instead of quoted text | Failed exact-text edits |
| Rewrite lock | Blocks a third full rewrite of a file while the build is red | Rewrite loops |
| `restore_green` | Returns the project to the last green commit | Digging deeper into a broken state |
| No shell | Removes `bash`; a narrow `run` tool allows one command of the stack's own toolchain | Every way around the guards |
| Pitfall notes | One short file per stack, shown at the first build and after each compaction | Known traps the model cannot debug on its own |

The extension is not tied to Swift. It recognises Swift, Rust, Go, Maven, Gradle, .NET, Node and Python projects by their marker files, and a `.pi-build` file in the project overrides the build command.

### What the model sees

After every change, the extension appends one of two notes to the tool result. A green build:

```
[auto-build] swift build: OK. Committed automatically. Continue with the next step.
```

A red build looks like this, with the file path shortened and the offending source line attached:

```
[auto-build] swift build: FAILED. Fix exactly these lines with replace_lines. Do not rewrite or delete the file.
Sources/2048/Game.swift:57:17: error: cannot assign to property: 'self' is immutable
    > grid = newGrid
```

That is the whole feedback loop. No instructions about when to build, no compiler wall of text, and a line number the model can act on directly.

### Coordinates instead of quotes

The most effective single tool is the dullest one. `read` returns numbered lines, and `replace_lines` takes a line range:

```ts
const replaceLinesTool = defineTool({
	name: "replace_lines",
	description:
		"Replace lines start..end (1-based, inclusive) of a file with new content. " +
		"Use the line numbers from build errors. Empty content deletes the lines. " +
		"To insert without replacing, set end to start-1. To append, set start and end to 0.",
	parameters: Type.Object({
		path: Type.String(),
		start: Type.Integer(),
		end: Type.Integer(),
		content: Type.String(),
	}),
	async execute(_id, params, _signal, _onUpdate, ctx) {
		const full = resolve(ctx.cwd, params.path);
		const lines = readFileSync(full, "utf8").split("\n");
		const replacement = params.content === "" ? [] : params.content.replace(/\n$/, "").split("\n");
		lines.splice(params.start - 1, params.end - params.start + 1, ...replacement);
		writeFileSync(full, lines.join("\n"));
		return { content: [{ type: "text", text: `Replaced lines ${params.start}..${params.end}.` }] };
	},
});
```

This is shortened. The real version checks the range, handles appending and returns the changed region with fresh line numbers, so the model never has to re-read the file to continue.

### Taking the shell away

Removing `bash` takes a few lines:

```ts
function restrictTools(): void {
	if (ALLOW_BASH) return;
	const available = new Set(pi.getAllTools().map((tool) => tool.name));
	const active = pi.getActiveTools().filter((name) => name !== "bash" && name !== "edit");
	for (const name of ["read", "write", "ls", "find", "grep", "replace_lines", "run", "restore_green"]) {
		if (available.has(name) && !active.includes(name)) active.push(name);
	}
	pi.setActiveTools(active);
}
```

In its place, `run` executes exactly one command of the project's own toolchain: `swift` in a Swift package, `cargo` in a Rust crate, and so on. No pipes, no redirects, no `&&`, no inline code. Read-only git commands are allowed. When the model tried `mkdir` through it, the answer was a short refusal that named the allowed tools, and it carried on with `write`.

### The rewrite lock

The lock that the model had bypassed through the shell now holds. Shortened again:

```ts
pi.on("tool_call", async (event, ctx) => {
	const target = writtenPath(event.toolName, event.input);
	if (target && (writesWhileRed.get(basename(target)) ?? 0) >= MAX_WRITES_WHILE_RED) {
		return {
			block: true,
			reason: `[auto-build] Blocked: ${basename(target)} was already written ${MAX_WRITES_WHILE_RED} times ` +
				`without a green build. Do not rewrite it. Call replace_lines with the reported line number.`,
		};
	}
});
```

### Pitfall notes

The pitfall note for Swift is one sentence: a SwiftUI app started with `swift run` shows no window unless the app sets its activation policy. In the Reversi run the model needed 26 minutes to find that out. With the note, the final run had it right in the first version of `main.swift`.

What remained of `AGENTS.md` is about 25 lines. You will find them below.

---

## The Real Bottleneck Was Thinking

The last run on LM Studio had the full harness and no shell. The game logic built green after three minutes. After 76 minutes the project still held only that logic and a draft of the self-test.

The log explained why: **72% of all output tokens were thinking.** At 20 tokens per second, a model that spends three quarters of its output on deliberation has the working speed of a model running at 5. The tools were no longer the problem.

Remember the 0.1%. You cannot tell this model to think less. So I tested every control I could find. The server-side ones got the same two prompts, one that needs a tool call and one that needs code.

| Control | Result |
| --- | --- |
| LM Studio effort levels | Remapped before the template; `minimal` never arrived |
| LM Studio reasoning budget field | No effect |
| Editing the chat template so `low` means effort 0.0 | Worked, but the model still thinks at effort 0 |
| Prefilling the template to skip the thinking block | Broke tool calls in LM Studio with a grammar error |
| `llama-server` with effort `none` | Still 841 output tokens on the code prompt, most of them thinking |
| `llama-server` with `--reasoning-budget 0` | No thinking, but also no tool call: the reply degenerated into empty blocks |
| `llama-server` with `--reasoning-budget 300` and a budget message | Thinking cut roughly in half on the code prompt, tool calls intact |

Only the last row is a working brake. When the budget is used up, the server forces a closing sentence into the thinking block. Mine reads: "Enough thinking. Act now: call the next tool or write the answer."

A budget of zero sounds like the natural choice and is the wrong one. This model needs a few tokens of thought to produce a well-formed tool call.

---

## Results

| Run | Task | Setup | Outcome | Time |
| --- | --- | --- | --- | --- |
| An early run | Four in a Row | LM Studio, slim rule file, shell | Playable | 76 min |
| A later run | Reversi | LM Studio, first harness, shell | Playable | 82 min, plus 26 min for the missing window |
| First 2048 attempt | 2048 | LM Studio, harness with rewrite lock, shell | Skeleton only, abandoned | 79 min |
| Second 2048 attempt | 2048 | LM Studio, harness without shell | Logic and a self-test draft, abandoned | 76 min |
| Final run | 2048 | `llama-server`, harness without shell, thinking budget 300 | Playable, self-test green | 33 min |

All three 2048 runs used the identical prompt:

```
Build a 2048 game for macOS as a Swift package with SwiftUI. I move the tiles with the arrow keys or with on-screen arrow buttons. Show the score, detect when the game is won or over, and add a "New Game" button. Add a --selftest flag that checks the merge rules without opening a window.
```

The final run finished 32 minutes and 41 seconds after that prompt, in 70 rounds. Thinking fell to roughly a third of the 19,845 output tokens. The game logic stood after three minutes, the self-test after six, and the 160-line SwiftUI view was written in one piece in under two and a half minutes.

The harness did its work quietly. There were 20 green and 12 red builds, and every red state was repaired within a few rounds. The model used `replace_lines` 28 times and a full `write` only 7 times, six of them for new files and one to update the plan. No source file was rewritten and nothing was deleted.

The self-test earned its place. Its first execution failed two of fifteen checks, both on the row `[2,2,2,2]`, which must become `[4,4,0,0]`. That was a real bug in the slide function, an index advanced one step too far after a merge. The fix was one line.

The game was playable on the first manual start, arrow keys included. No window fix was needed.

---

## What This Does Not Show

**One run is not a trend.** The final run is a single data point. It needs to be repeated with a different task before the 33 minutes mean anything general.

**More than one thing changed at once.** Compared with the run before it, the server moved from LM Studio with an edited chat template to `llama-server` with the original template, and the budget was added. I have not measured how much each contributed.

**The budget is a brake, not a wall.** Most thinking blocks stayed under 300 tokens. One reached about 1,250 before the closing sentence appeared, and a second one also ran well over. The first of these was useful: the model traced a test by hand and found that random tiles made its assertions unreliable.

**The model adjusts tests as well as code.** One failing check was replaced by a simpler case instead of being corrected. The logic behind it was traced by hand and is right, but the coverage is thinner than the green result suggests.

**Compaction is expensive.** With 8,000 tokens reserved, Pi compacts the context at around 24,000 tokens. Each of the two compactions froze the run for about three minutes. Together they cost 6.5 of the 33 minutes.

**Only Swift was tested.** The harness detects eight stacks, but every run so far built a SwiftUI game. The other paths are covered by mock tests only.

---

## Build It Yourself

Everything below is what runs on my machine. Paths assume macOS on Apple Silicon with 32 GB.

### 1. Get the model and the server

Download the `Q4_K_M` GGUF of Inkling 2 Mini. I pulled `lmstudio-community/Inkling-2-Mini-GGUF` through LM Studio, which stores it under `~/.lmstudio/models/`. Any GGUF path works. The original weights are on [Hugging Face](https://huggingface.co/thinkingmachines/Inkling-2-Mini).

For the server, take a prebuilt macOS arm64 archive from the [llama.cpp releases](https://github.com/ggml-org/llama.cpp/releases) and unpack it. I use build b12651 in `~/llama-bin/`. Homebrew's stable formula was too old when I tried it.

### 2. Start the server with a thinking budget

Save this as `start-llama.sh`:

```bash
#!/bin/bash
# Usage: bash start-llama.sh [thinking-budget] [context]
BUDGET="${1:-300}"
CTX="${2:-32000}"
PORT=8081
LS="$HOME/llama-bin/llama-b12651/llama-server"
MODEL="$HOME/.lmstudio/models/lmstudio-community/Inkling-2-Mini-GGUF/Inkling-2-Mini-Q4_K_M.gguf"

[ -x "$LS" ] || { echo "llama-server not found: $LS"; exit 1; }
[ -f "$MODEL" ] || { echo "model not found: $MODEL"; exit 1; }

exec "$LS" -m "$MODEL" \
  -c "$CTX" -ngl 99 --jinja --port "$PORT" --alias inkling -np 1 \
  --temp 0.7 --top-p 0.95 --top-k 40 --min-p 0.05 \
  --chat-template-kwargs '{"reasoning_effort":"none"}' \
  --reasoning-budget "$BUDGET" \
  --reasoning-budget-message "Enough thinking. Act now: call the next tool or write the answer."
```

Three flags do the work. `--chat-template-kwargs` sets the lowest effort the template knows. `--reasoning-budget 300` is the cap for a single thinking block, in tokens. `--reasoning-budget-message` is the sentence the server forces in at that point, so the model lands on an action instead of mid-thought.

If LM Studio is still holding the model, unload it first. Two copies do not fit in 32 GB.

### 3. Install Pi and point it at the server

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Pi needs Node 22.19 or newer. Add the server as a provider in `~/.pi/agent/models.json`:

```json
{
  "providers": {
    "llamaserver": {
      "baseUrl": "http://localhost:8081/v1",
      "api": "openai-completions",
      "apiKey": "none",
      "models": [
        {
          "id": "inkling",
          "name": "Inkling 2 Mini (llama-server)",
          "reasoning": true,
          "input": ["text"],
          "contextWindow": 32000,
          "maxTokens": 8192,
          "compat": {
            "thinkingFormat": "chat-template",
            "chatTemplateKwargs": { "reasoning_effort": "none" },
            "supportsDeveloperRole": false
          }
        }
      ]
    }
  }
}
```

If you change the context size in the start script, change `contextWindow` here as well. Otherwise Pi plans with the wrong number.

Then tighten compaction in `~/.pi/agent/settings.json`. Pi's defaults reserve 16,384 tokens and keep 20,000 recent ones, which is far too generous for a 32k window:

```json
{
  "defaultThinkingLevel": "minimal",
  "compaction": {
    "enabled": true,
    "reserveTokens": 8000,
    "keepRecentTokens": 3000
  }
}
```

With these values the context after a compaction dropped from between 13,000 and 18,000 tokens to about 8,500.

### 4. Install the harness extension

```bash
mkdir -p ~/.pi/agent/extensions ~/.pi/agent/pitfalls
curl -fsSL https://deemkeen.github.io/assets/pi-harness/autobuild.ts \
  -o ~/.pi/agent/extensions/autobuild.ts
```

Read it before you run it, as with any extension. It is [one file](/assets/pi-harness/autobuild.ts). Pi loads everything in that folder at startup, and `/reload` picks up changes in a running session.

Two switches are worth knowing:

- `PI_ALLOW_BASH=1 pi` starts Pi with the shell left in place, for sessions where you want it.
- A file named `.pi-build` in a project overrides the detected build command. Its first non-comment line is run as the build.

### 5. Add the rule file and a pitfall note

`~/.pi/agent/AGENTS.md`, in full:

```
Start with a minimal skeleton that builds. Write
a plan of at most 6 steps to PLAN.md, then do one
step at a time.

There is no shell. Look at files with ls, find,
grep and read. Create new files with write. Change
existing files with replace_lines, using line
numbers. Run tests or a self-test with run.

Write at most 40 lines per tool call; to continue
a file, append with replace_lines. The build runs
automatically after every change and every state
is committed automatically. To fix a build error,
call replace_lines with the reported line number.
Never rewrite a file you already wrote. No comments
in code. When unsure, pick one option and act; the
compiler will tell you if it is wrong.

Never touch files outside the project directory
or inside build output directories. Never launch
GUI apps yourself. When the task is complete and
the build succeeds, stop and tell me how to run it.
```

Be honest about what this file does. The model ignored the 40-line limit in every run. The file describes the tools; the extension enforces the behaviour.

Pitfall notes live in `~/.pi/agent/pitfalls/<stack>.md`, where the stack is one of `swift`, `rust`, `go`, `maven`, `gradle`, `dotnet`, `node` or `python`. Mine for Swift:

```bash
cat > ~/.pi/agent/pitfalls/swift.md <<'EOF'
A SwiftUI app started with swift run shows no window or Dock icon unless an app delegate calls NSApp.setActivationPolicy(.regular) and NSApp.activate(ignoringOtherApps: true).
EOF
```

Add a line whenever the model loses half an hour on something a human would know.

### 6. Run it

```bash
bash start-llama.sh
mkdir ~/Developer/my2048 && cd ~/Developer/my2048
pi --provider llamaserver --model inkling
```

Paste a plain prompt, like the 2048 one above, and leave it alone. Every state lands in the project's git history as `auto: build green` or `auto: wip (build red)`, so you can watch progress with `git log` from a second terminal.

---

## What I Take From It

1. **Instructions are suggestions, tools are law.** A small model follows what its tools make possible, not what a rule file asks for. Each rule that mattered had to become a mechanism.
2. **Take away power instead of adding rules.** Removing the shell did more than any guard built around it.
3. **Give the model coordinates.** Line numbers in, line ranges out. Exact-text matching asks a small model for a precision it does not have.
4. **Measure before tuning.** The thinking-level setting looked active in the interface for many runs and never reached the model. Only the server log showed it.
5. **Cap thinking with a positive budget.** Effort levels did not limit this model, and a budget of zero broke tool calls. A few hundred tokens with a clear closing sentence was the first setting that changed the outcome.
6. **Keep the prompt simple.** Once the harness carries the discipline, four plain sentences are enough.

Next on the list: a second task on the same configuration, a project that is not Swift, and a run on a machine with more memory and a larger context window, which should make compaction rarer.

If you rebuild this and it behaves differently on your hardware, I would like to hear about it.
