---
layout: post
title: "The Language Your AI Agent Secretly Wishes You'd Use"
date: 2026-03-18 00:00:00 +0000
categories:
  - programming
  - ai
  - nerdstuff
---

Every programming language claims to be productive. But in 2026, there's a new benchmark that matters: **how well does an LLM write code in your language?**

Not how well *you* write code. How well does Claude, GPT, or Gemini generate correct, idiomatic, production-ready code — on the first try, without you hand-holding every line?

I've spent the past year building software with heavy AI assistance across multiple stacks, and the differences are staggering. Some languages feel like pair programming with a senior engineer. Others feel like babysitting an intern who read three conflicting textbooks overnight.

I ranked the most popular languages by a single criterion: **how reliably does an LLM produce code you'd actually ship?** We're starting at the bottom. The #1 pick might surprise you.

---

## #10: C++ — The Graveyard of Good Intentions

Let's start with the carnage.

C++ deserves the bottom spot not because it's obscure, but because it's *popular* and *terrible* for LLM-generated code at the same time. A dangerous combination.

The language is so vast that no human fully masters it. No LLM does either. C++11, 14, 17, 20, 23 — each standard added features but removed nothing. For every task, there are five to ten historically valid approaches stacked across different eras: smart pointers or raw pointers? `std::string` or `const char*`? Templates or `void*`? RAII or manual cleanup? Exceptions or error codes? `std::variant` or union?

LLMs generate C++ that jumps wildly between these epochs. Modern `auto` and range-based for-loops next to C-style casts and `malloc`. Syntactically correct. Stylistically schizophrenic. Hiding undefined behavior that works on your machine and segfaults in production.

Template metaprogramming makes it worse. Error messages that *humans* can barely read. An LLM trying to iteratively fix template errors enters a death spiral of increasingly creative but wrong solutions, each one spawning three new errors.

The cruel irony: C++ has probably the second-largest training corpus after Python. But quantity doesn't help when the data itself is contradictory — and with C++, it is by definition, because the language permits five decades of paradigms to coexist in a single file.

**Verdict:** Maximum training data. Maximum inconsistency. The language where AI-assisted development actively makes you *less* productive because you spend more time reviewing than you saved generating.

---

## #9: Java (Without Framework) — All Dressed Up, Nowhere to Go

Plain Java is a strange beast. It has strong typing, a mature compiler, and a gigantic training corpus. On paper, that's a winning hand.

In practice, it's a language nobody actually uses without a framework. And that's the problem — without Spring Boot or Quarkus constraining the solution space, an LLM faces a combinatorial explosion. "Build a REST endpoint" could mean Spring MVC, Spring WebFlux, JAX-RS with Jersey, Quarkus RESTEasy, Micronaut — each with different annotations, different conventions, different implicit behaviors.

The verbosity compounds the issue. Entity, Repository, Service, Controller, DTO, Mapper — Java's ceremony is extreme. An LLM burns through output tokens on boilerplate, and longer outputs mean more opportunities for the model to drift, hallucinate, or quietly start cutting corners with `// ... rest of implementation`.

Java without a framework is like a race car without a track. Powerful engine, no direction.

**Verdict:** Strong fundamentals betrayed by ecosystem fragmentation and crippling verbosity.

---

## #8: C — Beautiful Simplicity, Zero Safety Net

Here's a plot twist: C is *surprisingly* LLM-friendly — more so than most people expect.

The language is tiny. Really tiny. No overloading, no templates, no inheritance, no exceptions, no generics, no closures, no garbage collector. An LLM can master the *entire* language specification, not just the commonly-used subset. That's a property it shares with only one other language on this list — and that language is #1.

Idiomatic C looks the same everywhere. A `struct` with functions that operate on it. Manual memory allocation and deallocation. Pointer passing for output parameters. Header files declaring public interfaces. The patterns haven't changed in decades, which means the training data is extraordinarily consistent across eras. A well-written C function from 1995 looks almost identical to one written in 2025.

For straightforward systems code — parsers, protocol implementations, data structures, CLI tools — LLMs generate remarkably clean C. The absence of abstraction mechanisms means there's nowhere to over-engineer. You can't accidentally create a factory-builder-strategy-observer monstrosity in C because the language simply doesn't have the vocabulary for it.

But there's a dealbreaker that overrides all of this: **memory safety doesn't exist.**

Buffer overflows, use-after-free, double-free, off-by-one pointer arithmetic, null pointer dereferences, uninitialized reads, format string vulnerabilities — these are exactly the error classes where LLMs fail systematically, because the bugs are *syntactically invisible*. The code compiles cleanly. The tests pass. Valgrind might catch it, ASan might catch it — but the compiler won't, and an LLM iterating on compiler output has no signal that anything is wrong.

This isn't theoretical. Ask an LLM to implement a dynamic array in C — `realloc`, `memcpy`, size tracking. The generated code will look reasonable. It might even work for your test cases. But the edge cases — what happens when `realloc` returns a different pointer? When `size_t` wraps around on multiplication? When the caller frees the array and then accesses it through a stale pointer? — those are the bugs that slip through, because nothing in the language forces you to handle them.

In Go, an out-of-bounds access panics immediately. In Rust, it doesn't compile. In C, it silently corrupts memory and you find out three months later in a crash dump — or worse, in a CVE report.

**Verdict:** C is the most *underrated* language for LLM generation on the pure language design axis. Small, explicit, consistent, zero magic. But the complete absence of safety nets turns every AI-generated function into a trust exercise. The language that would rank top 3 if it had a bounds checker ranks #8 because it doesn't.

---

## #7: C# — The Quiet All-Rounder Nobody Talks About

C# does a lot of things right. Strong typing, good tooling, a rich standard library, and a reasonably consistent ecosystem centered around .NET. LLMs produce decent C# — it's Microsoft's primary language, well-represented in training data, and the conventions are fairly stable.

But it lives in a no-man's-land. It's not as minimal as Go, not as type-powerful as TypeScript, not as ecosystem-dominant as Java. The framework fragmentation is moderate — .NET has had its own share of historical pivots (ASP.NET → ASP.NET Core → Minimal APIs), and the DI/middleware patterns share some of the same implicit magic that haunts Spring Boot.

**Verdict:** Solid, unremarkable, and consistently good enough. The language equivalent of a reliable sedan — you won't write blog posts about it, but it gets you there.

---

## #6: Kotlin — The Heir That Arrived Too Late

Kotlin is arguably the *best-designed* language on this list for human developers. Null safety baked into the type system, data classes, coroutines, extension functions — it fixes almost everything wrong with Java.

For LLM-generated code, it has one critical weakness: training data volume. Kotlin's corpus is a fraction of Java's or Python's. LLMs know Kotlin well enough to write it, but not well enough to consistently write *idiomatic* Kotlin. You get code that looks like Java translated to Kotlin syntax — which works, but misses the point.

The multiplatform story (KMP) and the Compose ecosystem also fragment the patterns an LLM needs to learn. Backend Kotlin, Android Kotlin, and Compose Multiplatform Kotlin are almost three different dialects.

**Verdict:** Give it three more years of training data and it jumps to top 4. Right now, it's a better language than its ranking suggests — the LLMs just haven't caught up yet.

---

## #5: Python — The Uncomfortable Truth

Python is where most people *start* with AI-generated code. It's the default language for ChatGPT demos, the lingua franca of data science, and it has the largest training corpus of any language, period.

And yet it's only #5. Here's why.

No type enforcement at runtime. Type hints exist but are optional and unenforced. An LLM can generate a function that accepts a `str`, gets passed an `int`, and the error surfaces three layers deep in a completely unrelated traceback. The feedback loop is terrible.

The "many ways to do it" philosophy is the anti-Go. List comprehension or for loop? `dataclass` or `NamedTuple` or plain dict? `requests` or `httpx` or `urllib3` or `aiohttp`? `asyncio` or threading or multiprocessing? Every choice is valid, and LLMs mix styles freely within the same file.

Python's strength for AI code generation is speed of iteration — you get *something* running fast. But "running" and "correct" are different things, and Python makes it very easy to produce code that's the first but not the second.

**Verdict:** Fastest time-to-working-prototype. But you're trading compile-time safety for runtime surprises, and that trade-off hurts more when the code was written by a machine you need to trust.

---

## #4: Java + Spring Boot — Convention as Constraint

Wait, didn't Java just rank #9?

Yes — but "Java" and "Java + Spring Boot" are effectively different languages for LLMs. Spring Boot does at the framework level what our #1 pick does at the language level: it narrows the solution space.

Convention over configuration means the model doesn't have to choose. `@RestController`, `@Service`, `@Repository`, `@Entity` — the layered architecture is so deeply burned into the training data that LLMs produce it reflexively. Spring Boot Starters eliminate the "which library?" question: `spring-boot-starter-web` means Tomcat + Jackson + Spring MVC. No debate.

What keeps it from the top 3 is **implicit magic**. `@Transactional` looks innocent, but whether the transaction actually works depends on proxy configuration, call origin, and propagation settings — none visible in the code. Auto-configuration is a black box. An LLM generates syntactically perfect annotations that are semantically wrong, and no compiler catches it.

**Verdict:** The conventions lift it dramatically over raw Java. But conventions that are *implicit* will always lose to conventions that are *explicit* — which is exactly what separates #4 from #1.

---

## #3: Rust — When It Compiles, It's Probably Correct

Rust has the most seductive promise: if the compiler accepts it, you can trust it. No null pointers, no data races, no buffer overflows. The borrow checker is the ultimate code reviewer, and it doesn't get tired or distracted.

For AI-generated code, this *should* be paradise.

In practice, LLMs *fight* the borrow checker. Not because they don't know the rules, but because lifetime annotations and ownership decisions require deep architectural understanding across the entire program flow. An LLM generating a single function often lacks that context. The result: `.clone()` scattered everywhere, `Arc<Mutex<>>` as a crutch, or code that simply doesn't compile and needs three, four, five iterations.

Rust is the language where AI-generated code is most *correct when it works*. But the probability of first-attempt compilation is significantly lower than our top 2. And in an AI-assisted workflow, iteration speed matters.

**Verdict:** The strongest safety guarantees of any language. The steepest hill for an LLM to climb. If you have patience, the result is worth it. If you want flow, keep reading.

---

## #2: TypeScript — Brilliant, Unreliable, Everywhere

TypeScript combines the largest typed-language training corpus with a genuinely powerful type system. On a good day, LLM-generated TypeScript is the most *impressive* code on this list — complex React components, perfectly typed API layers, elegant generics.

On a bad day, you get type gymnastics that would make a compiler engineer wince. Union types nested inside conditional types mapped over template literal types. Technically correct. Practically unmaintainable. And the LLM has no sense of when it's crossing the line from useful typing into academic flex.

The ecosystem doesn't help. React or Vue or Svelte? Next or Nuxt or Astro? ESM or CommonJS — still, in 2026? `tsconfig.json` alone has dozens of options that fundamentally change language behavior. `strict: true` and `strict: false` are practically different languages.

TypeScript is the brilliant but unreliable colleague. You'll get flashes of genius and occasional chaos, sometimes in the same file.

**Verdict:** Highest ceiling of any language on this list. But the floor is lower than you'd expect, and the variance is the real problem.

---

## #1: Go

You knew it was coming. Or maybe you didn't, because Go is nobody's idea of an exciting language. It doesn't have generics worth mentioning until recently. No inheritance. No exceptions. No operator overloading. No macros. No magic.

**That's the entire point.**

Go wins because it's the only language where *every single dimension that matters for LLM-generated code* is strong simultaneously, without any of them undermining the others:

**Predictability.** For any given task, there's essentially one way to write it in Go. Ask five different LLMs to write an HTTP handler, and you get five nearly identical results. That's not a limitation. That's what makes AI-generated Go code *trustable* without reviewing every line.

**Formatting.** `go fmt`. Solved problem. The model never wastes a single token on style decisions. Every Go file on GitHub looks the same. Every Go file an LLM generates looks the same. Boring. Perfect.

**Explicitness.** No annotations that secretly change runtime behavior. No auto-configuration. No dependency injection magic. No decorator sorcery. What you read is what executes. When an LLM writes Go, the semantics are visible in the syntax.

**Error handling.** `if err != nil` is repetitive, mechanical, and nearly impossible to get wrong. Compare this to exception hierarchies, `try-catch` scoping decisions, or Rust's `?` chains that require understanding the full error type tree. Go's approach is tedious for humans. It's *trivial* for machines.

**The standard library.** `net/http`, `encoding/json`, `database/sql`, `crypto`, `os` — you can build serious production software without a single external dependency. Every third-party library is an opportunity for an LLM to hallucinate an API. Go minimizes that surface area.

**Language size.** Go's spec is small enough that an LLM can reliably master *all of it*, not just the commonly-used subset. With C++, TypeScript, or even Rust, every model has blind spots. With Go, there's barely anywhere to hide.

Put it all together and you get something no other language offers: **consistent, predictable, correct-on-first-attempt code generation.** Not the most elegant code. Not the most expressive. Not the most impressive on a conference slide.

Just the most *reliable.*

---

## The Uncomfortable Takeaway

The language you enjoy writing and the language that produces the most reliable AI-generated code are probably not the same.

Go is verbose, unopinionated about architecture, and deliberately missing features that other languages consider essential. It was designed for large teams of average programmers working on massive codebases at Google. It turns out that "optimized for readability by strangers" maps almost perfectly to "optimized for generation by machines."

In an era where a growing percentage of production code is AI-generated or AI-assisted, **the best language isn't the most expressive one — it's the most predictable one.**

And right now, nothing comes close to Go.
