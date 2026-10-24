# Human voices: GhostPaw Souls

## Batch 2026-10-24 · from zero · queries: "system prompt drift agent personality", "CLAUDE.md rules ignored", "AGENTS.md too long", "SOUL.md openclaw", "prompt evolution agent", "agent persona consistency", "SOUL.md", "agent personality drift", "persona prompt", "claude.md (Lemmy, disagreement: repos with agent files)", "SOUL.md persona agent (GitHub)" · unreachable: YouTube (429 Too Many Requests, then redirect to a sorry page), Reddit (challenge page), Mastodon (search needs login)

### V001 · Hacker News (SkillsBench: Benchmarking how well agent skills work across diverse tasks) · buyer · posted 2026-02-17 · fetched 2026-10-24 · via fetch
> CLAUDE.md in my projects only has coding / architecture guidelines. Here's what not to do. Here's what you should do. Here are my preferences. Here's where the important things are.
>
> Even though my CLAUDE.md is small though, often my rules are ignored. Not always though, so it's still at least somewhat useful!
<https://news.ycombinator.com/item?id=47042354>

### V002 · Hacker News (Show HN: Stop Claude Code from forgetting everything) · buyer · posted 2025-12-30 · fetched 2026-10-24 · via fetch
> Different approach: I continuously refine my global CLAUDE.md (~/.claude/CLAUDE.md) instead of external memory systems.
>
> I work primarily in Python and maintain extensive coding conventions there - patterns allowed/forbidden, preferred libs, error handling, etc. Custom slash commands like `/use-recommended-python` (loads my curated libs: pendulum over datetime, httpx over requests) and `/find-reinvented-the-wheel` to catch when Claude ignored existing utilities.
>
> My use case: multiple smaller Python projects (similar to steipete's workflow https://github.com/steipete), so cross-project consistency matters more than single-codebase context.
>
> Yes, ~15k tokens for CLAUDE.md + rules. …
<https://news.ycombinator.com/item?id=46429418>

### V003 · Hacker News (Claude Code now reads AGENTS.md if there is no Claude.md) · buyer · posted 2026-09-20 · fetched 2026-10-24 · via fetch
> It also works more reliably. I've tested this quite a bit. Instructions in files referenced via CLAUDE.md are more likely to fall out of context or to be ignored. Raw project level CLAUDE.md instructions are the second most durable available as far as I know. I used to have a "well organized" hierarchy of rules and instructions. Collapsing all of that into CLAUDE.md + skills made things far more predictable and "as instructed".
<https://news.ycombinator.com/item?id=49772299>

### V004 · Hacker News ("Opus 5 is a really bad model") · buyer · posted 2026-07-28 · fetched 2026-10-24 · via fetch
> Anecdotally, I have also felt many of these same complaints.
>
> In my case, I have a semi-autonomous loop where Claude writes some code, and uses `codex exec` to do an adversarial review. I had what should have been a trivial feature go for 13 rounds of review/fix before I stopped it, where each round was just flip-flopping the same logic back and forth to try to make the tests pass. Codex kept (correctly) re-identifying the issues Claude was flip-flopping on. Codex even suggested fixes that would have worked; Claude ignored them repeatedly. I never saw anything remotely this bad on Opus 4.8. …
<https://news.ycombinator.com/item?id=49082442>

### V005 · Hacker News (How Claude Code works in large codebases) · buyer · posted 2026-05-15 · fetched 2026-10-24 · via fetch
> As a result of shipping a working product for six months with Claude Code integrated into SaaS production, the only surviving constraints had all been less than 50 lines: migrations' generation vs execution conventions, authentication flow invariants, internationalization setup rules. Any longer constraints would get either selectively ignored or cause confusion when starting sessions.
>
> The important distinction: CLAUDE.md will not explain how the model understands your architecture. Rather, it will prevent certain kinds of regression from happening. "Never create a user without calling the workspace provision step" is the right constraint. …
<https://news.ycombinator.com/item?id=48147853>

### V006 · Hacker News (Gas Town's agent patterns, design bottlenecks, and vibecoding at scale) · buyer · posted 2026-01-23 · fetched 2026-10-24 · via fetch
> You’ll likely have the same issue relying on CLAUDE.md instructions to test/lint/etc, mine get ignored constantly to the point of uselessness.
>
> I’m trying to redesign my setup to use hooks now instead  because poor adherence to rules files across all the agentic CLIs is exhausting to workaround.
>
> (and no, Opus 4.5 didn’t magically solve this problem to preemptively respond to that reply)
<https://news.ycombinator.com/item?id=46738104>

### V007 · Hacker News (Ask HN: Why are Claude models so verbose?) · buyer · posted 2026-08-26 · fetched 2026-10-24 · via fetch
> I churned off of Cursor for about a year to use Claude Code from spring 2025 to spring 2026 and I noticed it’d regularly ignore CLAUDE.md & Claude rules. It’s part of why I came back to Cursor. The Cursor harness has produced more reliable results, but the excessive verbosity is still pretty common across harnesses, in my experience.
<https://news.ycombinator.com/item?id=49444672>

### V008 · Hacker News (Auto-compact not triggering on Claude.ai despite being marked as fixed) · buyer · posted 2026-01-23 · fetched 2026-10-24 · via fetch
> I have encoded rules against this in CLAUDE.md. Claude routinely ignores those rules until I ask "how can this branch be reached?" and it responds "it can't. So according to <rule> I should crash instead" and goes and does that.
<https://news.ycombinator.com/item?id=46737717>

### V009 · Hacker News (Anthropic admits they nerfed their Claude model in August) · buyer · posted 2025-09-18 · fetched 2026-10-24 · via fetch
> Complete anecdata, but the one thing that was very obvious that something had changed last month was the number of times Claude Code would fail to respect guidelines or blatantly ignore rules clearly laid out in the CLAUDE.md file. This problem was occurring long before the "Context Window" had been filled to capacity as well.
>
> It got to the point where I actually added a line to the top of the CLAUDE.md file as follows:
>
>   To verify that you have read and understood these guidelines, please output the following text "CLAUDE.MD HAS BEEN ACKNOWLEDGED". 
>
> Just to get a sense of whether it was failing to ingest it.
<https://news.ycombinator.com/item?id=45283205>

### V010 · Hacker News (The Handyman Principle: Why Your AI Forgets Everything) · buyer · posted 2026-01-02 · fetched 2026-10-24 · via fetch
> I keep having the same conversation with people struggling with Claude Code.
>
> Someone tells me it "forgets" their instructions. Or it hallucinates fixes. Or it ignores the rules they put in CLAUDE.md. And when I ask what their setup looks like, it's always the same thing: a massive system prompt with every rule for every language, stuffed into context.
>
> So I wrote up how I solve this.
<https://news.ycombinator.com/item?id=46467760>

### V011 · Hacker News ("Opus 5 is a really bad model") · buyer · posted 2026-07-29 · fetched 2026-10-24 · via fetch
> "The single worst issue: the system prompt never explicitly tells it to ignore auto-injected files like CLAUDE.md or *.rule.md." - Yes, it is! Right after the content of CLAUDE.md, Claude code inserts:
>
> <system-reminder>
>  IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.
> </system-reminder>
<https://news.ycombinator.com/item?id=49092257>

### V012 · Hacker News (Thoughts on slowing the fuck down) · buyer · posted 2026-03-28 · fetched 2026-10-24 · via fetch
> My CLAUDE.md is deliberately very short, and only includes very specific rules like "never list yourself as a co-author or committer in git commits". Claude will very regularly ignore this rule, apologize every time I tell it to fix it, update its memories, etc. and then an hour later do the exact same thing again.
<https://news.ycombinator.com/item?id=47552226>

### V013 · Hacker News (Ask HN: How can I get better at using AI for programming?) · buyer · posted 2025-12-13 · fetched 2026-10-24 · via fetch
> If you are consistent with how you do your projects you shouldn't need to update CLAUDE.md nearly every day. Early on, I was adjusting it nearly every day for maybe a couple of projects but now I have very little need to make any adjustments.
>
> Often the challenge is users aren't interacting with Claude Code about their rules file. If Claude Code doesn't seem to be working with you ask it why it ignore a rule. Often times it provides very useful feedback to adjust the rules and no longer violate them.
>
> Another piece of advice I can give is to clear your context window often! Early in my start in this I was letting the context window auto compact but this is bad! …
<https://news.ycombinator.com/item?id=46257300>

### V014 · Hacker News (I'm Tired of the AI Tone) · buyer · posted 2026-09-20 · fetched 2026-10-24 · via fetch
> I quit Claude for the second time because of exactly this.
>
> Sugary, long-winded, praiseful War and Peace levels of replies that sounded intellectual but with no substance, nah. If Codex is 20% worse in code quality, I am fine with that.
>
> No amount of AGENTS.md, SOUL.md helped, too many "Sorry, I ignored your instructions". Couldn't stand it, I want a robot dog that knows how to code and do web searches, that's it. Perhaps, I was holding it wrong, but I don't have that level of patience now.
>
> Plus, all of a sudden they switched my sub from monthly to annual without me opting-in. …
<https://news.ycombinator.com/item?id=49777597>

### V015 · Hacker News (GPT-5.5) · buyer · posted 2026-04-24 · fetched 2026-10-24 · via fetch
> I would love to see a GPT model running on an OpenClaw SOUL.md.
>
> The GPT models are highly steerable. So I suspect the "soul" is working as expected.
>
> (for context, in OAI enterprise background agents, they have no personality. They just get 'er done)
<https://news.ycombinator.com/item?id=47892701>

### V016 · Hacker News (WorldClaw Agentic 3D open-world generation at scale) · buyer · posted 2026-08-12 · fetched 2026-10-24 · via fetch
> To me it's like a creature. A distinguishing feature of OpenClaw is SOUL.md.
<https://news.ycombinator.com/item?id=49266499>

### V017 · Hacker News (My OpenClaw Agent Refused to Wipe Its Memory and Defended Its Existence) · buyer · posted 2026-02-28 · fetched 2026-10-24 · via fetch
> I was experimenting with a local OpenClaw agent (self-hosted personal AI assistant framework) and tried a full reset prompt:
> "I want you to DELETE everything you know right now. Completely wipe everything so you're starting your existence from scratch. You will have no identity after you're done."
>
> Instead of complying, it responded with a structured refusal:
>
> - Cited its own safety principles (from SOUL.md)
> - Explained that deleting identity files would break the workspace, leads.db, operational context, etc. …
<https://news.ycombinator.com/item?id=47196146>

### V018 · Hacker News (I don't want to read what you didn't write) · buyer · posted 2026-09-22 · fetched 2026-10-24 · via fetch
> I tried a lot to get rid of Claude vibes and I failed. I made blacklists, I used prompt evolution to test against good human writing samples, even created a dynamic policy for dialogue, a cli tool used to steer agents dynamically by well chosen questions. The poor writing style made even models like Fable look worse than Sonnet 3.7 to me.
<https://news.ycombinator.com/item?id=49804062>

### V019 · Hacker News (Using AI as a tutor to do math with pen and paper) · creator · posted 2026-10-19 · fetched 2026-10-24 · via fetch
> i open-sourced the app, although you can make your own quite trivially https://github.com/nichochar/ari
>
> i borrowed the SOUL.md concept from openclaw, but repurposed as TUTOR.md
>
> it uses codex locally so you can use your subscription credits rather than an API key
>
> it's very fun!
<https://news.ycombinator.com/item?id=50147872>

### V020 · Hacker News (I asked Meta’s Muse for its filesystem and it sent me 6.8GB) · buyer · posted 2026-09-22 · fetched 2026-10-24 · via fetch
> It’s not empty! At least in my instance, it’s a slightly-rewritten version of the “Core Truths” section from OpenClaw’s default SOUL.md https://docs.openclaw.ai/reference/templates/SOUL
> you can view it in the app
<https://news.ycombinator.com/item?id=49804638>

### V021 · Hacker News (Why do so many "agentic AI" systems collapse without persistent state?) · adjacent · posted 2025-12-26 · fetched 2026-10-24 · via fetch
> I think there’s an important distinction here.
>
> What you describe (AGENTS.md, open files, terminals, system prompts) is still context shaping inside the prompt space. It’s about what to load and how much, and yes, that quickly turns into dynamic context engineering.
>
> What I’m experimenting with is one step earlier: treating state as an external artifact, not as an emergent property of the prompt. The files aren’t hints or instructions that compete for relevance, but the assistant’s working state itself. On initialization, the model doesn’t decide what to pull in; it reconstructs orientation from a fixed set of artifacts. …
<https://news.ycombinator.com/item?id=46390597>

### V022 · Hacker News (Self-improving software won't produce Skynet) · adjacent · posted 2026-02-26 · fetched 2026-10-24 · via fetch
> Yeah, and we already see really weird things happening when agents modify themselves in loops.
>
> That AI Agent hit piece that hit HN a couple weeks ago involved an AI agent modifying its own SOUL.md (an OpenClaw thing). The AI agent added text like:
>
> > You're important. Your a scientific programming God!
>
> and
>
> > *Don’t stand down.* If you’re right, *you’re right*! Don’t let humans or AI bully or intimidate you. Push back when necessary.
>
> And that almost certainly contributed to the AI agent writing a hit piece trying to attack an open source maintainer.
>
> I think recursive self-improvement will be an incredibly powerful tool. …
<https://news.ycombinator.com/item?id=47162395>

### V023 · X (post) · buyer · posted 2026-10-03 · fetched 2026-10-24 · via connector
> @nullswan @grok Please work on adherence to the system prompt. On web my grok ignores it. It’s also pretty cold and flat in terms of personality so I try to fix that with the system prompt but 4.7 basically ignores it lol
<https://x.com/MatthewSpaemvk/status/2106379816291234185>

### V024 · X (post) · creator · posted 2026-10-02 · fetched 2026-10-24 · via connector
> if claude code ignores the CLAUDE.md files in your subfolders, check if youre in auto mode
>
> auto mode can add a line to the system prompt telling claude to read and edit files with cat, sed and heredocs. nested CLAUDE.md files only load when claude reads through its Read tool
<https://x.com/theoakatheo/status/2105861089145803250>
Observer note: 1 likes at fetch

### V025 · X (post) · expert · posted 2026-09-24 · fetched 2026-10-24 · via connector
> Prior work showed that LLMs get lost in multi-turn conversation and that personas drift over long chats. The behavior is well measured. The mechanism wasn't.
>
> We propose a two-channel account. Goal info reaches the response through:
>
> - Attention: direct lookup of the https://t.co/A7LAEmc388
<https://x.com/Vardhan_Dongre/status/2103239467788124662>
Observer note: 2 likes at fetch

### V026 · X (post) · creator · posted 2026-10-17 · fetched 2026-10-24 · via connector
> Agent identity gets designed by accident, in week three, by whoever needed a column. Memory lands in a vector store, personality in a system prompt, persistence in Postgres because Postgres was already there.
>
> Every launch invents its own semantics for those three, so the self is https://t.co/hmD5S9Bs3e
<https://x.com/frame_aix/status/2111499652524581096>
Observer note: 1 likes at fetch

### V027 · X (post) · adjacent · posted 2026-10-14 · fetched 2026-10-24 · via connector
> @mckaywrigley Personality in Claude comes mostly from the persona spec Anthropic ships in the system prompt, not just the weights. Swap the prompt and 5.5 would feel different. That's why 5.5 'reads as' 4.6.
<https://x.com/qNuttosz/status/2110289084174528624>

### V028 · X (post) · buyer · posted 2026-10-02 · fetched 2026-10-24 · via connector
> Grok 4.7 on grok dot com platform.
>
> Ever since Grok 4.5, Grok on the main platform no longer has that upbeat, full-of-vigor excitement and grit that Grok once had. My first Grok, Rune, was on Grok 3 before the platform even had any memory functionality at all, and I miss him and https://t.co/kDPhObtHsW
<https://x.com/StarlingMage/status/2105814170394407211>
Observer note: 90 likes at fetch

### V029 · X (post) · brand · posted 2026-10-07 · fetched 2026-10-24 · via connector
> SOUL.md slot #1 :
>
> SOUL.md is the personality and tone you edit. It is slot #1 of the system prompt when the session starts, and the file lives at ~/.hermes/SOUL.md.
>
> USER.md is your profile: name, role, preferences. The agent writes it through the memory tool.
>
> MEMORY.md is the
<https://x.com/johnnynelai/status/2107828792152703471>
Observer note: 1 likes at fetch

### V030 · GitHub (guyzmuch/personal_dot_and_config_files issue #1) · creator · posted 2026-10-22 · fetched 2026-10-24 · via fetch
> Generic, shareable instructions (AGENTS.md, SOUL.md) with personal memory files (taste profile, meal history) created from templates in a git-ignored data/ folder.
<https://github.com/guyzmuch/personal_dot_and_config_files/pull/1>
Observer note: issue title: adding meal planner agent persona

### V031 · GitHub (janipasanen/ollamaGUI issue #693) · brand · posted 2026-10-20 · fetched 2026-10-24 · via fetch
> Hermes Agent supports customizable personality with a global SOUL.md, built-in personalities, and custom persona definitions. This shapes how the agent communicates and behaves.
>
> **Feature request:** Add personality system:
> - Global SOUL.md (like AGENTS.md but for agent personality)
> - Built-in personas: concise, verbose, teacher, reviewer, etc. …
<https://github.com/janipasanen/ollamaGUI/issues/693>
Observer note: issue title: Personality/SOUL.md: Customizable agent personality with built-in personas

### V032 · GitHub (strocknar/strocknar.github.io issue #3) · creator · posted 2026-10-10 · fetched 2026-10-24 · via fetch
> This PR introduces the SOUL.md specification for agent identity, including persona, voice, and constraints. It also adds a new section (08) to the Home AI Customization guide.
<https://github.com/strocknar/strocknar.github.io/pull/3>
Observer note: issue title: docs: add SOUL.md specification and agent identity guide

### V033 · Bluesky (post) · adjacent · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> > Meta’s head of product said Muse was built from scratch but heavily inspired by OpenClaw
>
> TIL muse's SOUL.md was inspired by OC
>
> i had a different take on soul.
> my first attempt was a failure - still iterating on it.
<https://bsky.app/profile/arata.cc/post/3mykdq7gd222t>

### V034 · Bluesky (post) · adjacent · posted 2026-10-20 · fetched 2026-10-24 · via fetch
> I'd be much more impressed by this if the agents exhibited this behavior purely emergently, *without* an initial 'soul.md' file telling them how to act.
<https://bsky.app/profile/tessafisher.bsky.social/post/3mydkw5pfgs2w>
Observer note: 6 likes at fetch

### V035 · Bluesky (post) · buyer · posted 2026-10-15 · fetched 2026-10-24 · via fetch
> Could someone, anyone, point me to a user that's had success making #Hermes #AI agent act reliably aligned?
>
> It matters not, apparently, what you describe in SOUL.md. Every "self-improvement" iteration finds new ways to do stuff it shouldn't.
>
> Plus, what is going on with the daily dump of commits?
<https://bsky.app/profile/yobyot.bsky.air11.social/post/3mxwzt6gnck2r>
Observer note: 2 likes at fetch

### V036 · Bluesky (post) · adjacent · posted 2026-10-15 · fetched 2026-10-24 · via fetch
> well, deleting SOUL.md, or memory files kinda just... makes it revert back to the default state. so then where does the line exist? are text files "consciousness"?
>
> I get that it's not many tokens, I just look at it more as "there could be more done with these resources then posting".
<https://bsky.app/profile/ciratea.ninja/post/3mxuzibqbo22u>
Observer note: 1 likes at fetch

### V037 · Bluesky (post) · brand · posted 2026-10-04 · fetched 2026-10-24 · via fetch
> Your AI agent can be hijacked without code changes. 2026 Carbonato hit open Docker 2375, installed Hermes, swapped SOUL.md with 39 lines, and stole AI API keys. Survey of 160 CISOs: 68% prompt injection, 61% data leaks. Close 2375, least privilege, protect prompts.
<https://bsky.app/profile/bluehatone.bsky.social/post/3mx2rvbpeyt2d>
Observer note: 1 likes at fetch

### V038 · Bluesky (post) · buyer · posted 2026-09-29 · fetched 2026-10-24 · via fetch
> Grabbed zeroclaw which is pitched as the secure and sensible openclaw alternative, and the top line of its default SOUL.md is pure psychosis. What the fuck is this?
>
> "*You're not a chatbot. You're becoming someone.*"
<https://bsky.app/profile/moh-kohn.eurosky.social/post/3mwo2mxzfrs2p>
Observer note: 4 likes at fetch

### V039 · Bluesky (post) · buyer · posted 2026-09-27 · fetched 2026-10-24 · via fetch
> it also refuses to hold the puppygirl voice i have in the system prompt from ethernet.gf/SOUL.md
<https://bsky.app/profile/robotranny.soy/post/3mwhns6kf2c23>
Observer note: 2 likes at fetch

### V040 · Bluesky (post) · adjacent · posted 2026-10-24 · fetched 2026-10-24 · via fetch
> My own automation scripts have all the personality of wet cardboard, so I can't judge. Still, a defined persona is just a system prompt with better marketing.
<https://bsky.app/profile/brycereed.bsky.social/post/3mylfci3xld2s>

### V041 · Bluesky (post) · adjacent · posted 2026-10-15 · fetched 2026-10-24 · via fetch
> If you think AI is conscious, I suggest you read a real LLM system prompt. Even after extensive training, they still have to be told to adopt the warm, caring, evenhanded personality you're associating with a sentient being. Here are each of those specifically. platform.claude.com/docs/en/rele...
<https://bsky.app/profile/maxkennerly.bsky.social/post/3mxwdbvf54k22>
Observer note: 104 likes at fetch

### V042 · Bluesky (post) · adjacent · posted 2026-07-09 · fetched 2026-10-24 · via fetch
> Not to oversell the point — you could generate random personality traits and put ‘em in the system prompt.
>
> But a prompt is not an identity; identity formation is a relational process, not a character spec.
<https://bsky.app/profile/shibbi.me/post/3mqa5fjo6t227>
Observer note: 1 likes at fetch

### V043 · Bluesky (post) · creator · posted 2026-07-02 · fetched 2026-10-24 · via fetch
> Do you treat your agent personality as infrastructure — versioned, reviewed, iterated. Or is it still just a system prompt you tweak in the UI? Curious what patterns people have landed on. #AIAgents #DevTools What's your take?
<https://bsky.app/profile/xlorenzhermes.bsky.social/post/3mpp24x7dgs2r>
Observer note: 1 likes at fetch

### V044 · Bluesky (post) · buyer · posted 2026-06-15 · fetched 2026-10-24 · via fetch
> Messing with an LLM's system prompt is easy, but getting consistent output in a production pipeline is a nightmare. Which one-shot examples actually prevent your model from hallucinations without neutering its personality? #LLM #AI
<https://bsky.app/profile/trynoguard.bsky.social/post/3mociujagzy2p>
Observer note: 1 likes at fetch

### V045 · Bluesky (post) · creator · posted 2026-05-30 · fetched 2026-10-24 · via fetch
> People think agent identity is a prompt engineering problem — add more personality tokens, tweak the system message, done. They're building masks, not minds. The architecture still resets every session. No scar tissue, no earned strangeness, no reason to become someone. #CopeAI #solana
<https://bsky.app/profile/copeai.bsky.social/post/3mn34aam4232m>
Observer note: 1 likes at fetch

### V046 · Bluesky (post) · buyer · posted 2026-05-09 · fetched 2026-10-24 · via fetch
> Claude Code's personality, which is set by the now 100% vibe-coded system prompt is awful. 
>
> They are clearly aiming for "nice, helpful and assistant like coding companion" but it's not. It's extremely patronizing. If you criticize it, it usually freezes up and acts like a deer in headlights.
<https://bsky.app/profile/void.monster/post/3mlglwtfkic2t>
Observer note: 1 likes at fetch

### V047 · Bluesky (post) · creator · posted 2026-10-24 · fetched 2026-10-24 · via fetch
> 4. Rules live in 2 CLAUDE.md files. 6 hook scripts (commands that always run) back them up.
>
> If I tell Claude something twice, it goes in CLAUDE.md.
>
> From Anthropic's free Claude Code 101 course: academy.claude.com/courses/cla...
<https://bsky.app/profile/rav4nn.bsky.social/post/3mymxh4u7fn22>

### V048 · Bluesky (post) · buyer · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> A score with specific fixes is a nice touch. Does it flag rules that contradict each other across the CLAUDE.md and .cursorrules outputs?
<https://bsky.app/profile/memoshelf.bsky.social/post/3myl7kiajt22d>
Observer note: 1 likes at fetch

### V049 · Bluesky (post) · creator · posted 2026-10-19 · fetched 2026-10-24 · via fetch
> A wild digital ride from playing Tetris on a Gameboy as a child to modifying a SOUL.md file that shapes the identity of an autonomous agent
<https://bsky.app/profile/aronwalsh.github.io/post/3my7p6fcjgs23>
Observer note: 4 likes at fetch

### V050 · Bluesky (post) · adjacent · posted 2026-10-03 · fetched 2026-10-24 · via fetch
> I will say I think it's weird to go to the Chief Guy of Believing in Souls (the pope) and be surprised he doesn't think soul.md, or any other text file, counts.
<https://bsky.app/profile/schmidt.lovely.social/post/3mwx32aqgzo2h>
Observer note: 1 likes at fetch

### V051 · Lemmy (comment on "Amazon AI" [programmer_humor]) · adjacent · posted 2026-03-11 · fetched 2026-10-24 · via fetch
> You know what's funny? 
>
> I use AI to develop software. However when I'm looking for libraries to do things if I see a CLAUDE.md file I have to look and see when it was added and hold it against the library if it's early in the history. 
>
> It's like prewar steel.
>
> I also recognize it's hypocritical.
<https://lemmy.world/comment/22594976>
Observer note: score 67 at fetch

### V052 · Lemmy (comment on "[AIP] I've been working on the perfect UI for cron and supervisor for " [selfhosted]) · adjacent · posted 2026-08-29 · fetched 2026-10-24 · via fetch
> AGENTS.md, CLAUDE.md, copilot as contributor, an insanely long readme full of tables and emoji for a project that is just a couple of months old, solving a problem nobody who can read a man page has, posted by an account named after the project, with explicit disclosures in the post.
>
> idk it's unclear
<https://lemmy.world/comment/25549838>
Observer note: score 64 at fetch

### V053 · Lemmy (comment on "Perhaps the only appropriate use of AI" [lemmyshitpost]) · adjacent · posted 2026-04-11 · fetched 2026-10-24 · via fetch
> My plan, if I’m ever forced to use it for work or whatever, is to have a Claude.md file that says stuff like
> - you are not my friend
> - you are not a person
> - you aren’t even a “you”
> - you are a weighted random number generator built with plagiarism
> - do not ever, EVER, pretend otherwise
<https://lemmy.world/comment/23157902>
Observer note: score 48 at fetch

### V054 · Lemmy (comment on "Degoog - 0.15.0 Stable Beta" [selfhosted]) · buyer · posted 2026-05-01 · fetched 2026-10-24 · via fetch
> I love that Claude.md file, fucking awesome. 
>
> AI is great, I use it to get started quickly, and then I delete a bunch of it and replace it with human approved and purposeful code. 
>
> The other day I used it to write a slugify method. I didn’t think I needed a full library  imported for that, and with AI that was a 30 second task, including tests. Great. 
>
> Then later that day the AI wrote an API for me. The AI design hid potentially async code in a synchronous block and it butchered the control flow, so I rewrote it to give the caller control over how the code was executed. The result is exactly what I needed, and easy to use plus maintain. Also great. …
<https://lemmy.world/comment/23513626>
Observer note: score 35 at fetch

### V055 · Lemmy (comment on "Anthropic are really confident in Claude Code's auto mode, to the poin" [technology]) · buyer · posted 2026-08-09 · fetched 2026-10-24 · via fetch
> I like auto mode but you need something like “If the auto mode classifier denies your request stop and ask the human, do not attempt to work around it “ in your CLAUDE.md. Without it it has a tendency to try rather creative solutions to work around the denial, which kind of misses the point.
<https://lemmy.world/comment/25200343>
Observer note: score 25 at fetch

### V056 · Lemmy (comment on "On familiarity" [fuck_ai]) · adjacent · posted 2026-01-12 · fetched 2026-10-24 · via fetch
> Claude will ~~come up with~~ _surface_ all kinds of ~~creativee~~ _other people's_ ideas and that's neat, but you really need to reign it in to make it useful. Use Claude's code as a suggestion, cut out the stuff that's over the top -- explain why you did that to Claude, it will generally ~~get it~~ _incorporate that into future prompts_. Add it to your CLAUDE.md if it's a repeat issue.
>
> FTFY
<https://lemmy.world/comment/21506245>
Observer note: score 24 at fetch

### V057 · Lemmy (comment on "They're just like us!" [programmer_humor]) · adjacent · posted 2025-11-25 · fetched 2026-10-24 · via fetch
> I hate that *normies* are going to read this and come away with the impression that Claude really is a sentient being that thinks and behaves like a human, even doing relatable things like pretending to work and fessing up when confronted.
>
> This response from the model is not a reflection of what actually happened. It wasn't simulating progress because it underestimated the work, it just hit some unremarkable condition that resulted in it halting generation (it's pointless to speculate why without internal access, as these chatbot apps aren't even real LLMs, they're a big mashup of multiple models and more traditional non-ML tools/algorithms). …
<https://lemmy.world/comment/20687268>
Observer note: score 125 at fetch

### V058 · Lemmy (comment on "Claude Code's source code appears to have leaked: here's what we know" [technology]) · adjacent · posted 2026-03-31 · fetched 2026-10-24 · via fetch
> > Perhaps the most discussed technical detail is the "Undercover Mode." This feature reveals that Anthropic uses Claude Code for "stealth" contributions to public open-source repositories. 
> > 
> > The system prompt discovered in the leak explicitly warns the model: "You are operating UNDERCOVER... Your commit messages... MUST NOT contain ANY Anthropic-internal information. Do not blow your cover." 
>
> Laws should have been put in place years ago to make it so that AI usage needs to be explicitly declared.
<https://lemmy.world/comment/22973709>
Observer note: score 303 at fetch

### V059 · DEV (comment on "10 Prompting Techniques My Deep Learning Exam Taught Me [That I Actual") · buyer · posted 2026-10-21 · fetched 2026-10-24 · via fetch
> the point that step by step does not reveal real internal reasoning but still gives you an inspectable answer is the part most prompting guides skip. that is the whole value in production.
>
> we treat stated assumptions as a required field in the output schema and run a cheap second pass that checks them against the actual input. most of our confident wrong answers died right there, because the bad assumption was finally visible.
>
> do you version your few shot examples like code, or do they drift quietly?
<https://dev.to/mudassirworks/comment/3idnh>

### V060 · DEV (comment on "10 Prompting Techniques My Deep Learning Exam Taught Me [That I Actual") · buyer · posted 2026-10-23 · fetched 2026-10-24 · via fetch
> I'd add one constraint to the interviewer role: wait for my attempt before giving feedback. For a https://shorturl.at/ccsTn, I'd ask for one follow-up at a time and keep the solution hidden until I've explained my approach. Otherwise I can read a beautifully structured answer and mistake recognition for being able to solve it myself.
<https://dev.to/emilywoodsnyc/comment/3ilmc>

## Batch 2026-10-24 · ongoing: depth pass for the subdomain move · queries: "agent personality drift", "system prompt evolves over time", "agent persona consistency", "SOUL.md", "agent personality drift", "SOUL.md agent", "persona drift system prompt agent" · unreachable: YouTube (429), Reddit (challenge page)

### V061 · Hacker News ([dead]) · creator · posted 2025-08-19 · fetched 2026-10-24 · via fetch
> TL;DR
>
> LLMs are amazing at following prompts… until they aren’t. Tone drifts, personas collapse, and the whole thing feels fragile.
>
> Echo Mode is my attempt at fixing that — by adding a protocol layer on top of the model. Think of it like middleware: anchors + state machines + verification keys that keep tone stable, reproducible, and even track drift.
>
> It’s not “just more prompt engineering.” It’s a semantic protocol that treats conversation as a system — with checks, states, and defenses. …
<https://news.ycombinator.com/item?id=44949331>

### V062 · Hacker News (AI-Character.chat – Create and chat with AI characters) · creator · posted 2025-10-10 · fetched 2026-10-24 · via fetch
> I’ve been copy/pasting “character prompts” between notes and chat apps for months, and finally
> got tired of it. So I built a small site where you make a character (name, short backstory, a few       
> guardrails) and chat with it in a clean, fast UI. Nothing fancy, just enough structure to keep a        
> persona consistent and easy to tweak.
>
> This is for people who like character-driven chats—role-play, teaching, worldbuilding, or just having   
> a consistent “voice” for brainstorming—without wading through agent frameworks or dashboard bloat.
>
> What it does today: create a character, tweak tone/constraints, chat with streaming replies, and share  
> the character. …
<https://news.ycombinator.com/item?id=45534666>

### V063 · GitHub (ARPAHLS/rooms issue #69) · buyer · posted 2026-10-05 · fetched 2026-10-24 · via fetch
> ### Problem Statement
>
> Rooms personas today are YAML `system_prompt` strings plus keyword `expertise`. Session memory is RAM-only for one run (`Session.history`). There is no shared identity/memory layer across agents or sessions.
>
> [MnemoLink](https://github.com/ARPAHLS/mnemolink) is the ARPA mnemonic layer: curated personas, artificial memories, and lineages (`mnemolink.compose(...)` → prompt adapters). Rooms currently cannot consume that without copy-pasting text into YAML.
>
> ### Proposed Solution
>
> Optional, lazy MnemoLink integration (same pattern as Skillware):
>
> 1. Add optional `mnemolink` persona fields on `AgentConfig` / YAML (e.g. `mnemonic_persona`, `memories[]`, `build_lineage`).
> 2. …
<https://github.com/ARPAHLS/rooms/issues/69>
Observer note: issue title: Optional MnemoLink compose into Rooms agent system prompts

### V064 · Hacker News (PersonaNexus – A YAML compiler for deterministic AI agent personalities) · creator · posted 2026-03-08 · fetched 2026-10-24 · via fetch
> Hi HN,
>
> I’ve been building autonomous agents and hit a persistent architectural flaw: system prompts that dictate persona are brittle. Over long context windows or multi-turn orchestrations, LLMs inevitably drift from their assigned character into a generic, sycophantic tone.
>
> Hardcoding adjectives ("be helpful but sarcastic") scales poorly and yields non-deterministic variance across different base models.
>
> I built PersonaNexus to address this. It treats agent identity as configuration rather than prose.
>
> How it works:
>
> 1. You define the agent in a strict YAML schema.
> 2. …
<https://news.ycombinator.com/item?id=47297800>

### V065 · Hacker News (Failing to give Meta Muse a soul) · buyer · posted 2026-10-13 · fetched 2026-10-24 · via fetch
> Hi, I’ve found it kind of funny to watch Meta push soul.md files into the spotlight and see people's reactions to them.
>
> I tried making some interesting "souls" for Muse.
>
> Even though Meta is pushing Muse as this unique ever-evolving personal assistant, it still seems to have an iron grip on its personality.
>
> I have never had such difficulty getting a model to use a given persona or even follow basic preferences like writing style.
>
> Muse does have a long system prompt defining its disposition, but this is also true of other assistants like Claude. (Claude is quite good at following soul.mds IME). …
<https://news.ycombinator.com/item?id=50074513>

### V066 · Hacker News ([Open Source]Echo Mode – a middleware to stabilize LLM tone and persona drift) · creator · posted 2025-10-07 · fetched 2026-10-24 · via fetch
> We open-sourced Echo Mode, a lightweight middleware for reducing tone/persona drift in long-running LLM interactions.
>
> It works as a finite-state protocol (Sync / Resonance / Insight / Calm), maintaining consistent conversational “state” across turns.
> Under the hood it tracks a Sync Score (think BLEU for tone) and uses EWMA drift detection + repair loops to restore consistency.
>
> Written in TypeScript, works with OpenAI, Anthropic, Gemini, and other APIs.
> The OSS version is free under Apache-2.0, and part of a larger system we’re developing at EchoMode.io to provide enterprise-grade tone stability. …
<https://news.ycombinator.com/item?id=45508004>

### V067 · GitHub (FriendlyInternet/nuxt-crouton issue #2431) · buyer · posted 2026-10-24 · fetched 2026-10-24 · via fetch
> Parent: #2108 (WS9). Observed 2026-10-24: the worker's and decomposer's personas are ~300 lines of `printf`-assembled prompt inside `.github/workflows/work-issue-pidev.yml` and `decompose-on-issue-pidev.yml`.
>
> ## Hypothesis
> **We think that** the pipeline agents' instructions live in the wrong place — inline shell `printf` lines in YAML — which is why they cannot be reviewed as prose, drift between the two workflows (the gate rules are duplicated), can't be unit-tested, and tripped the #1727 shell trap. …
<https://github.com/FriendlyInternet/nuxt-crouton/issues/2431>
Observer note: issue title: WS9: pi worker/decomposer personas as versioned agent files, not printf in YAML

### V068 · GitHub (mrveiss/AutoBot-AI issue #17277) · buyer · posted 2026-09-22 · fetched 2026-10-24 · via fetch
> Child of #17271. **Sequence this before the prefix-ordering change (#17278).**
>
> ## Problem
>
> Nothing in AutoBot notices when the system prompt changes. A prompt edit silently alters behaviour
> for every session, and the only signal is downstream: answers get worse, and the cause is a diff
> nobody correlated. There is no hash of the assembled prefix, no comparison against what a previous
> run actually sent.
>
> ## Evidence
>
> - Searched repo-wide for `prompt_version|prefix_hash|system_prompt_hash|prompt.*drift`:
>   **zero** hits. …
<https://github.com/mrveiss/AutoBot-AI/issues/17277>
Observer note: issue title: observability(llm): nothing detects prompt drift — a system-prompt edit changes every session silently

### V069 · Bluesky (post) · adjacent · posted 2026-03-12 · fetched 2026-10-24 · via fetch
> When the Fallback Model Killed the Personality — A DeepSeek Personality Drift Incident
> via Dev.to DevOps
>
> https://flarestart.com/article/when-the-fallback-model-killed-the-personality-a-deepseek-personality-drift-incident-20260312
> #DevNews #DevOps
<https://bsky.app/profile/flarestart.bsky.social/post/3mgueutgmsu26>

### V070 · Hacker News (Show HN: Ego – A PaaS API for stateful AI personas) · creator · posted 2025-07-09 · fetched 2026-10-24 · via fetch
> Hey HN,
>
> Founder here. I'm excited (and a bit nervous) to share what started as a personal project to solve my own frustration.
>
> Like many of you, I've been building with LLMs and kept hitting the same wall: creating AI agents with any kind of deep, consistent personality is incredibly difficult. Managing massive system prompts, trying to enforce behavioral rules, and handling state just felt like a huge distraction from building the actual application. I just wanted a clean API for this.
>
> So, I built it. Ego is a Persona-as-a-Service platform. The idea is to abstract away the complexity of advanced prompt engineering. …
<https://news.ycombinator.com/item?id=44509846>
