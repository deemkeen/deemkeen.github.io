import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { Type } from "typebox";
import { defineTool, type ExtensionAPI, getAgentDir } from "@earendil-works/pi-coding-agent";

const SKIP_DIRS = new Set([
	".git", ".build", ".gradle", ".idea", ".pi", ".venv", "venv", "__pycache__", "node_modules",
	"build", "dist", "out", "target", "bin", "obj", "DerivedData", "coverage",
]);
const SKIP_EXTENSIONS = new Set([".md", ".txt", ".log", ".lock"]);
const GIT_EXCLUDES = [".build", "node_modules", "target", "build", "dist", ".gradle", "__pycache__", ".venv"].map(
	(name) => `:(exclude)${name}`,
);
const NOISE = /command failed with exit code|use -v to see invocation|^\s*\|?\s*`-/;
const MAX_FILES = 5000;
const MAX_DEPTH = 8;
const MAX_ERRORS = 6;
const MAX_WRITES_WHILE_RED = 2;
const RED_STREAK_HINT = 3;
const BUILD_TIMEOUT_MS = 300000;

const ALLOW_BASH = process.env.PI_ALLOW_BASH === "1";
const RUN_TIMEOUT_MS = 120000;
const RUN_TOOLS: Record<string, string[]> = {
	swift: ["swift"],
	rust: ["cargo"],
	go: ["go"],
	maven: ["mvn", "./mvnw"],
	gradle: ["gradle", "./gradlew"],
	dotnet: ["dotnet"],
	node: ["npm", "npx", "node"],
	python: ["python3", "python", "pytest"],
};
const GIT_READONLY = new Set(["status", "log", "diff", "show"]);
const VERSION_FLAGS = new Set(["--version", "-version", "version", "-v"]);
const INLINE_CODE_FLAGS = new Set(["-c", "-e", "-", "--eval", "-p"]);

function splitCommand(command: string): string[] | undefined {
	const tokens: string[] = [];
	let current = "";
	let quote = "";
	let started = false;
	for (const ch of command.trim()) {
		if (quote) {
			if (ch === quote) quote = "";
			else current += ch;
		} else if (ch === "'" || ch === '"') {
			quote = ch;
			started = true;
		} else if (/\s/.test(ch)) {
			if (ch === "\n") return undefined;
			if (started || current) tokens.push(current);
			current = "";
			started = false;
		} else if (";|&<>`$".includes(ch)) {
			return undefined;
		} else {
			current += ch;
		}
	}
	if (quote) return undefined;
	if (started || current) tokens.push(current);
	return tokens;
}

function checkRun(tokens: string[], stack: string | undefined): string | undefined {
	const [program, ...args] = tokens;
	if (program === "git") {
		return GIT_READONLY.has(args[0] ?? "") ? undefined : "Only git status, git log, git diff and git show are allowed. Commits happen automatically.";
	}
	const allowed = stack ? (RUN_TOOLS[stack] ?? []) : [];
	const known = Object.values(RUN_TOOLS).flat();
	if (allowed.includes(program)) {
		if (args.some((arg) => INLINE_CODE_FLAGS.has(arg))) return "Inline code is not allowed. Put the code into a project file with write and run that file.";
		return undefined;
	}
	if (known.includes(program) && args.length === 1 && VERSION_FLAGS.has(args[0])) return undefined;
	const list = allowed.length > 0 ? allowed.join(", ") : "version checks such as swift --version";
	return `Not allowed: ${program}. Allowed here: ${list}, and git status|log|diff|show. Use ls, find, grep and read to inspect files, write to create them and replace_lines to change them.`;
}

interface BuildCommand {
	command: string;
	args: string[];
	label: string;
}

function has(dir: string, name: string): boolean {
	return existsSync(join(dir, name));
}

function detectBuild(dir: string): BuildCommand | undefined {
	if (has(dir, ".pi-build")) {
		const line = readFileSync(join(dir, ".pi-build"), "utf8").split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#"));
		if (line) return { command: "sh", args: ["-c", line], label: line };
	}
	if (has(dir, "Package.swift")) return { command: "swift", args: ["build"], label: "swift build" };
	if (has(dir, "Cargo.toml")) return { command: "cargo", args: ["check", "--quiet"], label: "cargo check" };
	if (has(dir, "go.mod")) return { command: "go", args: ["vet", "./..."], label: "go vet ./..." };
	if (has(dir, "pom.xml")) {
		const mvn = has(dir, "mvnw") ? "./mvnw" : "mvn";
		return { command: mvn, args: ["-q", "compile"], label: `${mvn} -q compile` };
	}
	if (has(dir, "build.gradle") || has(dir, "build.gradle.kts")) {
		const gradle = has(dir, "gradlew") ? "./gradlew" : "gradle";
		return { command: gradle, args: ["-q", "classes"], label: `${gradle} -q classes` };
	}
	if (readdirSync(dir).some((name) => name.endsWith(".sln") || name.endsWith(".csproj"))) {
		return { command: "dotnet", args: ["build", "--nologo", "-v", "q"], label: "dotnet build" };
	}
	if (has(dir, "package.json")) {
		let scripts: Record<string, unknown> = {};
		try {
			scripts = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).scripts ?? {};
		} catch {
			scripts = {};
		}
		if (typeof scripts.typecheck === "string") return { command: "npm", args: ["run", "-s", "typecheck"], label: "npm run typecheck" };
		if (has(dir, "tsconfig.json")) return { command: "npx", args: ["tsc", "--noEmit"], label: "npx tsc --noEmit" };
		if (typeof scripts.build === "string") return { command: "npm", args: ["run", "-s", "build"], label: "npm run build" };
	}
	if (has(dir, "pyproject.toml") || has(dir, "setup.py") || has(dir, "requirements.txt")) {
		return {
			command: "python3",
			args: ["-m", "compileall", "-q", "-x", "(^|/)(\\.venv|venv|node_modules|\\.git)/", "."],
			label: "python3 -m compileall",
		};
	}
	return undefined;
}

function detectStack(dir: string): string | undefined {
	if (has(dir, "Package.swift")) return "swift";
	if (has(dir, "Cargo.toml")) return "rust";
	if (has(dir, "go.mod")) return "go";
	if (has(dir, "pom.xml")) return "maven";
	if (has(dir, "build.gradle") || has(dir, "build.gradle.kts")) return "gradle";
	if (readdirSync(dir).some((name) => name.endsWith(".sln") || name.endsWith(".csproj"))) return "dotnet";
	if (has(dir, "package.json")) return "node";
	if (has(dir, "pyproject.toml") || has(dir, "setup.py") || has(dir, "requirements.txt")) return "python";
	return undefined;
}

function loadPitfalls(dir: string): string | undefined {
	const stack = detectStack(dir);
	if (!stack) return undefined;
	const file = join(getAgentDir(), "pitfalls", `${stack}.md`);
	if (!existsSync(file)) return undefined;
	const text = readFileSync(file, "utf8").trim();
	return text ? `Known pitfalls for ${stack} projects:\n${text}` : undefined;
}

function sourceStamp(dir: string): string {
	let newest = 0;
	let count = 0;
	const visit = (path: string, depth: number) => {
		if (depth > MAX_DEPTH || count >= MAX_FILES) return;
		for (const entry of readdirSync(path, { withFileTypes: true })) {
			if (count >= MAX_FILES) return;
			const full = join(path, entry.name);
			if (entry.isDirectory()) {
				if (!SKIP_DIRS.has(entry.name)) visit(full, depth + 1);
			} else if (entry.isFile() && !SKIP_EXTENSIONS.has(extname(entry.name)) && entry.name !== ".DS_Store") {
				count++;
				newest = Math.max(newest, statSync(full).mtimeMs);
			}
		}
	};
	visit(dir, 0);
	return `${count}:${newest}`;
}

function locate(line: string): { file: string; line: number } | undefined {
	const match =
		line.match(/([^\s:()[\]"']+\.\w+):(\d+)(?::\d+)?[:\s]/) ??
		line.match(/([^\s:()[\]"']+\.\w+)\((\d+),\d+\)/) ??
		line.match(/([^\s:()[\]"']+\.\w+):\[(\d+),\d+\]/) ??
		line.match(/File "([^"]+)", line (\d+)/);
	return match ? { file: match[1], line: Number(match[2]) } : undefined;
}

function describeErrors(output: string, dir: string): string[] {
	const lines = output.split("\n").filter((line) => line.trim());
	const candidates = lines.filter((line) => /error|FAILED|failed|cannot find/i.test(line) && !NOISE.test(line));
	const seen = new Set<string>();
	const result: string[] = [];
	for (const line of candidates) {
		const where = locate(line);
		const key = where ? `${where.file}:${where.line}` : line.trim();
		if (seen.has(key)) continue;
		seen.add(key);
		const message = line.trim().split(`${dir}/`).join("");
		let code = "";
		if (where) {
			const path = isAbsolute(where.file) ? where.file : join(dir, where.file);
			try {
				const source = readFileSync(path, "utf8").split("\n")[where.line - 1];
				if (source?.trim()) code = `\n    > ${source.trim()}`;
			} catch {
				code = "";
			}
		}
		result.push(`${message}${code}`);
		if (result.length >= MAX_ERRORS) break;
	}
	return result.length > 0 ? result : lines.slice(-6);
}

function writtenPath(toolName: string, input: Record<string, unknown>): string | undefined {
	if (toolName === "write" && typeof input.path === "string") return input.path;
	const command = typeof input.command === "string" ? input.command : "";
	return command.match(/(?:cat|tee)\s*>?\s*>\s*([^\s<;&|]+)/)?.[1];
}

function deletes(command: string): boolean {
	const cleaned = command.replace(/rm\s+(-\w+\s+)*\/tmp\/\S*/g, "");
	return /(^|[\s;&|(])rm\s/.test(cleaned) || /\s-delete\b/.test(cleaned) || /git\s+(clean|reset\s+--hard|checkout\s+(--\s+)?\.)/.test(cleaned);
}

function numberReadOutput(text: string, offset: number): string {
	const lines = text.split("\n");
	let noteStart = lines.length;
	if (lines.length >= 2 && /^\[(Showing lines|\d+ more lines|Line \d+ is)/.test(lines[lines.length - 1])) {
		noteStart = lines[lines.length - 2] === "" ? lines.length - 2 : lines.length - 1;
	}
	if (noteStart === 0) return text;
	return lines.map((line, index) => (index < noteStart ? `${String(offset + index).padStart(4)}| ${line}` : line)).join("\n");
}

function numbered(lines: string[], from: number, to: number): string {
	const first = Math.max(1, from);
	const last = Math.min(lines.length, to);
	const out: string[] = [];
	for (let n = first; n <= last; n++) out.push(`${String(n).padStart(4)}| ${lines[n - 1]}`);
	return out.join("\n");
}

const replaceLinesTool = defineTool({
	name: "replace_lines",
	label: "Replace lines",
	description:
		"Replace lines start..end (1-based, inclusive) of a file with new content. Use the line numbers from build errors. " +
		"Empty content deletes the lines. To insert without replacing, set end to start-1. To append at the end of the file, set start and end to 0. Returns the changed region with line numbers. The read tool shows the same numbers as a prefix like \"  12| \"; that prefix is not part of the file, never include it in content.",
	promptSnippet: "replace_lines: change a file by line number (no need to repeat the old text)",
	parameters: Type.Object({
		path: Type.String({ description: "File path relative to the project directory" }),
		start: Type.Integer({ description: "First line to replace (1-based)" }),
		end: Type.Integer({ description: "Last line to replace (inclusive); start-1 to insert before start" }),
		content: Type.String({ description: "New text for these lines; empty string deletes them" }),
	}),
	async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
		const full = resolve(ctx.cwd, params.path);
		if (relative(ctx.cwd, full).startsWith("..")) throw new Error("Path is outside the project directory.");
		if (!existsSync(full)) throw new Error(`File not found: ${params.path}`);
		const lines = readFileSync(full, "utf8").split("\n");
		const start = params.start === 0 ? lines.length + (lines[lines.length - 1] === "" ? 0 : 1) : params.start;
		const end = params.start === 0 ? start - 1 : params.end;
		if (start < 1 || start > lines.length + 1 || end < start - 1 || end > lines.length) {
			throw new Error(`Invalid range ${start}..${end}. The file has ${lines.length} lines. Its last lines are:\n${numbered(lines, lines.length - 5, lines.length)}`);
		}
		const replacement = params.content === "" ? [] : params.content.replace(/\n$/, "").split("\n");
		lines.splice(start - 1, end - start + 1, ...replacement);
		writeFileSync(full, lines.join("\n"));
		const view = numbered(lines, start - 3, start + replacement.length + 2);
		return {
			content: [{ type: "text", text: `Replaced lines ${start}..${end} of ${params.path} with ${replacement.length} line(s). Now:\n${view}` }],
			details: { path: params.path, start, end, inserted: replacement.length },
		};
	},
});

export default function (pi: ExtensionAPI) {
	let lastStamp: string | undefined;
	let lastErrors: string[] = [];
	const writesWhileRed = new Map<string, number>();
	let pitfallsShown = false;
	let redStreak = 0;

	pi.registerTool(replaceLinesTool);

	pi.registerTool(
		defineTool({
			name: "run",
			label: "Run",
			description:
				"Run one build-tool command of this project, for example a self-test or the test suite (swift run App --selftest, cargo test, mvn test, npm test). " +
				"One command only: no pipes, redirects, && or ;. Also allowed: git status, git log, git diff, git show. Never start GUI apps.",
			promptSnippet: "run: run one build-tool command of the project (tests, self-test); there is no shell",
			parameters: Type.Object({
				command: Type.String({ description: "The command, e.g. swift run MyApp --selftest" }),
			}),
			async execute(_toolCallId, params, signal, _onUpdate, ctx) {
				const tokens = splitCommand(params.command);
				if (!tokens || tokens.length === 0) {
					throw new Error("One command only: no pipes, redirects, && or ;. Example: swift run MyApp --selftest");
				}
				const refusal = checkRun(tokens, detectStack(ctx.cwd));
				if (refusal) throw new Error(refusal);
				const result = await pi.exec(tokens[0], tokens.slice(1), { cwd: ctx.cwd, timeout: RUN_TIMEOUT_MS, signal });
				const output = `${result.stdout}\n${result.stderr}`.trim();
				const tail = output.length > 4000 ? `...\n${output.slice(-4000)}` : output;
				const status = result.killed ? "stopped after timeout (GUI apps must be started by the user)" : `exit code ${result.code}`;
				return { content: [{ type: "text", text: `${status}\n${tail || "(no output)"}` }], details: { code: result.code } };
			},
		}),
	);

	async function lastGreenCommit(dir: string): Promise<string | undefined> {
		const result = await pi.exec("git", ["log", "--grep=^auto: build green", "-n", "1", "--format=%h"], { cwd: dir, timeout: 10000 });
		const hash = result.stdout.trim();
		return result.code === 0 && hash ? hash : undefined;
	}

	pi.registerTool(
		defineTool({
			name: "restore_green",
			label: "Restore green",
			description:
				"Restore all project files to the last version that built successfully. Use it when the build has been red for several changes and you are stuck. " +
				"Nothing is lost: every state stays in git. Afterwards, redo your change in smaller steps.",
			promptSnippet: "restore_green: go back to the last version that built successfully",
			parameters: Type.Object({}),
			async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
				const hash = await lastGreenCommit(ctx.cwd);
				if (!hash) throw new Error("There is no successful build yet, so there is nothing to restore.");
				const changed = await pi.exec("git", ["diff", "--name-only", hash, "--", "."], { cwd: ctx.cwd, timeout: 10000 });
				const restored = await pi.exec("git", ["checkout", hash, "--", "."], { cwd: ctx.cwd, timeout: 30000 });
				if (restored.code !== 0) throw new Error(`Restore failed: ${restored.stderr.trim()}`);
				const files = changed.stdout.trim().split("\n").filter(Boolean);
				return {
					content: [{ type: "text", text: `Restored ${files.length} file(s) to the last green build (${hash}): ${files.join(", ") || "nothing had changed"}. Read the file again before you change it.` }],
					details: { hash, files },
				};
			},
		}),
	);

	function restrictTools(): void {
		if (ALLOW_BASH) return;
		const available = new Set(pi.getAllTools().map((tool) => tool.name));
		const active = pi.getActiveTools().filter((name) => name !== "bash" && name !== "edit");
		for (const name of ["read", "write", "ls", "find", "grep", "replace_lines", "run", "restore_green"]) {
			if (available.has(name) && !active.includes(name)) active.push(name);
		}
		pi.setActiveTools(active);
	}

	pi.on("before_agent_start", async (event, ctx) => {
		restrictTools();
		const pitfalls = loadPitfalls(ctx.cwd);
		if (!pitfalls) return;
		pitfallsShown = true;
		return { systemPrompt: `${event.systemPrompt}\n\n${pitfalls}` };
	});

	pi.on("session_compact", async () => {
		pitfallsShown = false;
	});

	async function commit(dir: string, message: string): Promise<boolean> {
		const inside = await pi.exec("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir, timeout: 10000 });
		if (inside.code !== 0) await pi.exec("git", ["init", "-q"], { cwd: dir, timeout: 10000 });
		await pi.exec("git", ["add", "-A", "--", ".", ...GIT_EXCLUDES], { cwd: dir, timeout: 30000 });
		const result = await pi.exec("git", ["commit", "-q", "-m", message], { cwd: dir, timeout: 30000 });
		return result.code === 0;
	}

	pi.on("session_start", async (_event, ctx) => {
		writesWhileRed.clear();
		lastErrors = [];
		pitfallsShown = false;
		redStreak = 0;
		restrictTools();
		lastStamp = detectBuild(ctx.cwd) ? sourceStamp(ctx.cwd) : undefined;
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!detectBuild(ctx.cwd)) return;
		const input = event.input as Record<string, unknown>;
		const command = event.toolName === "bash" && typeof input.command === "string" ? input.command : "";
		if (command && deletes(command)) {
			return {
				block: true,
				reason: "[auto-build] Blocked: deleting files is not allowed here. Keep the files and change single lines with replace_lines.",
			};
		}
		const target = writtenPath(event.toolName, input);
		if (target && (writesWhileRed.get(basename(target)) ?? 0) >= MAX_WRITES_WHILE_RED) {
			const errors = lastErrors.length > 0 ? `\nOpen errors:\n${lastErrors.join("\n")}` : "";
			return {
				block: true,
				reason: `[auto-build] Blocked: ${basename(target)} was already written ${MAX_WRITES_WHILE_RED} times without a green build. Do not rewrite it. Call replace_lines with path "${target}", the reported line number as start and end, and the corrected line as content.${errors}`,
			};
		}
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName === "read" && !event.isError) {
			const offset = typeof event.input.offset === "number" && event.input.offset >= 1 ? Math.floor(event.input.offset) : 1;
			let done = false;
			const content = event.content.map((part) => {
				if (done || part.type !== "text") return part;
				done = true;
				return { ...part, text: numberReadOutput(part.text, offset) };
			});
			return { content };
		}
		if (!["write", "edit", "bash", "replace_lines", "run", "restore_green"].includes(event.toolName)) return;
		const build = detectBuild(ctx.cwd);
		if (!build) return;

		const written = writtenPath(event.toolName, event.input);
		if (written) writesWhileRed.set(basename(written), (writesWhileRed.get(basename(written)) ?? 0) + 1);

		const stamp = sourceStamp(ctx.cwd);
		const changed = lastStamp === undefined ? event.toolName !== "bash" || written !== undefined : stamp !== lastStamp;
		if (!changed) {
			lastStamp = stamp;
			return;
		}

		const result = await pi.exec(build.command, build.args, { cwd: ctx.cwd, timeout: BUILD_TIMEOUT_MS, signal: ctx.signal });
		let note: string;
		if (result.code === 0) {
			writesWhileRed.clear();
			lastErrors = [];
			redStreak = 0;
			const committed = await commit(ctx.cwd, "auto: build green");
			note = `[auto-build] ${build.label}: OK.${committed ? " Committed automatically." : ""} Continue with the next step.`;
		} else {
			lastErrors = describeErrors(`${result.stdout}\n${result.stderr}`, ctx.cwd);
			await commit(ctx.cwd, "auto: wip (build red)");
			redStreak++;
			note = `[auto-build] ${build.label}: FAILED. Fix exactly these lines with replace_lines. Do not rewrite or delete the file.\n${lastErrors.join("\n")}`;
			if (redStreak >= RED_STREAK_HINT && (await lastGreenCommit(ctx.cwd))) {
				note += `\n[auto-build] The build has been red for ${redStreak} changes in a row. If you are stuck, call restore_green to return to the last working version, then redo the change in smaller steps.`;
			}
		}
		if (!pitfallsShown) {
			const pitfalls = loadPitfalls(ctx.cwd);
			if (pitfalls) note += `\n[auto-build] ${pitfalls}`;
			pitfallsShown = true;
		}
		lastStamp = sourceStamp(ctx.cwd);
		return { content: [...event.content, { type: "text" as const, text: note }] };
	});
}
