---
layout: post
title: "Git as Federation Transport — Rethinking How Small Social Networks Talk to Each Other"
date: 2025-11-18 00:00:00 +0000
categories:
  - ssh
  - git
  - fediverse
  - nerdstuff
---

For the past weeks I've been deep in the weeds of building [**stegodon**](https://github.com/deemkeen/stegodon), my tiny, terminal-first microblog server. You write posts entirely over SSH in a TUI, hit `Ctrl+S`, and they appear as ActivityPub Notes in the Fediverse.

But a new idea has been stuck in my head:

## **What if federation didn't need HTTP at all?**

What if servers didn't push JSON to each other over inbox endpoints, deal with reverse proxies, queues, or retries?

What if we could federate **entirely over Git**?

This post is a first look at that idea — and why I'm seriously considering building an experimental Git-powered federation mode into stegodon.

---

# 🧠 **The Core Idea: "Git as Federation Transport"**

Here's the premise:

> Instead of sending ActivityPub activities over HTTP,
> each instance becomes a Git repository.
> Posts and activities are stored as Git objects.
> Synchronization happens through `git push` and `git fetch`.

No HTTP endpoints.
No inbox queues.
No background workers.
Just simple, predictable, text-based replication using Git — the tool developers already trust every day.

Let's break it down.

---

# 📦 **1. Each instance = a Git repository**

Every stegodon instance already stores posts as small JSON documents.
Representing them in Git is a natural fit:

```
repo/
  users/alice/posts/0012.json
  outbox/0012.json
  follows/bob.txt
  actors/alice.json
```

Each commit becomes an activity: Create, Update, Delete, Follow.

Git gives us:

* immutable history
* content addressing
* diffability
* compression
* offline operations
* signing (SSH or GPG)

It's basically *social media meets version control*.

---

# 🔌 **2. Remotes per instance, not per user**

Most traditional federation models scale with the number of users.
But Git gives us a better pattern:

> **One Git remote per instance**, not per individual follower.

So if your server follows three other servers, you have three remotes:

```
origin     (your own)
bob-social (git@bob.social:stegodon.git)
carol-net  (git@carol.net:stegodon.git)
```

This keeps things lean and scalable — perfect for small, indie, nerdy communities.

---

# 📤 **3. Publishing = `git push`**

When a user posts something:

1. stegodon writes a JSON object
2. commits it with metadata
3. pushes it to follower instances:

```
git push bob-social main
git push carol-net main
```

No HTTP endpoint at all.
Just Git replication.

---

# 📥 **4. Reading = `git fetch`**

To get new posts from people you follow:

```
git fetch --all
```

Stegodon inspects the new commits, imports the activities, updates the timeline, and merges them into your local storage.

Federation becomes symmetrical:

> everyone sends and receives via the same transport.

---

# 🔒 **5. Security, integrity & offline-first for free**

Because Git is built around cryptographic object IDs and optional signing, you automatically get:

* tamper-evident history
* verifiable authorship
* built-in replication
* conflict resolution
* offline posting
* delayed sync
* no single point of failure

This is something most social protocols *try* to design — Git gives it to us out of the box.

---

# 🌍 **Why this feels right for small social networks**

This approach isn't meant to replace ActivityPub.
It's an **alternative federation mechanism** with a completely different philosophy:

* simple
* text-based
* terminal-friendly
* decentralized
* infrastructure-light
* hackable
* inspectable

It's perfect for:

* personal servers
* small communities
* self-hosters
* tilde-style networks
* people who prefer SSH over browsers
* experimental and research-driven systems

In other words: exactly the people who might enjoy using **stegodon**.

---

# 🚧 **Caveats and limits**

This won't scale to Mastodon-size global federation.
And that's okay.

The goal is not "a universal protocol for everyone".
The goal is:

> **A minimal, peer-to-peer, Git-powered social network for small groups of humans who love the terminal.**

---

# 🚀 **What's next? Experimental Implementation**

I plan to explore this in an **experimental branch** of stegodon:

* Git-backed storage for posts
* remotes-per-instance
* push on publish
* periodic or manual fetch
* merge timeline updates
* optional bridge to ActivityPub

It will probably be rough at the beginning, but that's the fun part.

If you like the idea, please reach out, open issues, or share thoughts.
I'd love to hear from people who want to explore Git as a transport layer for social software.

---

# 🐘 **Wrapping up**

Git-based federation is weird.
But it's also elegant in a way that's hard to ignore.

It turns blogging and federation into something *you can literally `git log`*.
Something you can sync over SSH on a Raspberry Pi.
Something you can fork.

And maybe — just maybe — that's exactly the kind of simplicity we need more of.
