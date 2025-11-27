---
layout: post
title: "I Made a Thing: Blogging Through SSH Because Browsers Are Overrated"
date: 2025-11-27 00:00:00 +0000
categories:
  - ssh
  - fediverse
  - nerdstuff
---

So I've been working on this project called Stegodon for a while now, and I figured it's time to actually write about it instead of just quietly pushing commits to GitHub at 2 AM.

The basic idea is pretty simple: what if you could blog directly from your terminal via SSH? No browser. No web forms. Just ssh yourdomain.com -p 23232 and you're writing. And then—because why not—it federates to Mastodon and the rest of the Fediverse through ActivityPub.

Yeah, I know how it sounds. "SSH blogging platform" sounds like something you'd build as a weekend joke project. But here's the thing: I've been using it for my own notes and posts, and it's actually kind of... nice? There's something weirdly satisfying about opening a terminal, SSHing into your own server, and just typing. No page load times. No cookies. No "Accept all cookies or read our 47-page privacy policy" banners.

I built the whole TUI with Charm's bubbletea and lipgloss libraries, which made the terminal interface actually pleasant to look at and use. The shortcuts are tab / shift+tab for navigation because why not, Ctrl+S to post a new note. It felt right pretty quickly, which was a good sign.

The federation part was... interesting. ActivityPub isn't exactly simple, and getting HTTP signatures right took longer than I'd like to admit. But now you can follow people on Mastodon, they can follow you back, and posts show up where they should. There's also RSS feeds for each user because RSS should never die, and a web interface for people who insist on using browsers (I know, I know, not everyone lives in their terminal).

Right now you can run it single-user or multi-user, there's Docker images if you want easy deployment, and it stores everything in SQLite with WAL mode. The code is Go, it's MIT licensed, and it lives at [github.com/deemkeen/stegodon](https://github.com/deemkeen/stegodon)

Here's where I could use some help though. I know the codebase pretty well at this point, but I'm just one person and I'm sure there are rough edges I'm not seeing. If you're into terminal UIs, federation protocols, Go, or just weird side projects, I'd love to have more eyes on this. Maybe you'll find a bug I missed. Maybe you'll have ideas for features I haven't thought of. Maybe you just want to poke around the code and see how ActivityPub works in practice.

And if you're someone who likes to vibecode with Claude or ChatGPT or whatever AI tool you prefer—hell yeah, bring that energy. Point your LLM at the codebase and see what interesting things emerge. Sometimes the best contributions come from people experimenting with different approaches, whether you're writing every line yourself or pair-programming with an AI. Code is code, and good ideas are good ideas.

Some things I'm thinking about for the future: better federation error handling, maybe support for media attachments (though I kind of like the text-only simplicity), possibly improving the web UI, better documentation for self-hosting. But honestly, I'm open to ideas. This whole thing started because I wanted to blog without opening a browser, and it grew from there. Who knows where it should go next?

If you want to try it out, the README has instructions. If you find bugs, open an issue. If you want to contribute, PRs are welcome. If you just want to tell me this is a terrible idea and I should have just used WordPress like a normal person, well, you're probably right but I built it anyway.

The repo is here: [Stegodon](https://github.com/deemkeen/stegodon)

I'm curious to see if anyone else finds this useful or interesting. Or if I'm just one of a few oddballs who wanted to SSH into a blogging platform. Either way, the code's out there now.
