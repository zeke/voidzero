## My process for making AI videos in a single creative flow

This is a first-person walkthrough of how I make a custom video out of many small AI-generated segments, stitched together with an intro and outro and shared to social media, all inside a single agent session. It's not about any one video. It's the general process, and it applies to any project of this shape: write a script, build the pieces one at a time, assemble them, and ship.

A thread that runs through the whole thing: I keep asking the agent to show me its work. Whenever there are candidates to choose between (images, voice takes, sound effects), I have the agent write a throwaway local web page, open it in my browser, and let me look at or listen to everything side by side. I pick the ones I like, paste my choices back into the session, and we move on. These are one-off, disposable tools that exist only to help me make a decision in the moment. The point is that I'm never just staring at a wall of text. I'm looking at and listening to the actual work.

### Start a session in an agent harness

I start inside an agent harness. The harness is the thing that wraps a language model and turns it into something that can actually do work. The model does what models do: it generates text. But the harness also gives it tools and handles the orchestration of running those tools and stitching the results back together. There are a few good options. [Claude Code](https://www.anthropic.com/claude-code) and [OpenAI's Codex](https://openai.com/codex/) are both fine choices. [OpenCode](https://opencode.ai) is my tool of choice for this kind of work. Once I'm in, I pick a model. For a project like this I reach for a top-tier model, because it's doing a lot of reasoning and coordinating across many steps.

### Describe what I want to build

With a session started and a model chosen, I describe the goal in plain language. The video is going to be composed of a bunch of smaller video segments, each created individually, one at a time, and then stitched together at the end. I describe each segment as having a few parts that we'll build up in sequence.

### Write the script

First comes the text for each segment. I keep the script relatively short, usually less than 30 seconds per segment, to stay within the limitations of current AI video models, which can't generate very long clips. So I write the script first, broken into short pieces, before generating anything.

### Collect training data for the deepfakes

If the video features deepfaked people, I need training data for each person. There are two kinds.

The first is a sample of the person speaking, for voice cloning. I grab a couple of existing videos of each person, then use two tools, [yt-dlp](https://github.com/yt-dlp/yt-dlp) to download the source video and [ffmpeg](https://ffmpeg.org) to extract about one minute of continuous, undisturbed speech. That one-minute clip is the training data for the voice. I feed it into a voice model (I use [MiniMax Speech](https://replicate.com/minimax/speech-2.8-hd) on [Replicate](https://replicate.com)) to create a trained instance of that person's voice, which I can later drive with text to produce custom text-to-speech audio.

The second kind of training data is sample images of each person. I gather a handful of photos of each person and put them in a folder. These become the identity reference for generating new stylized images later.

### Generate the speech

Now I take each segment's text and combine it with the trained voice for whoever is speaking that line. That produces a fresh audio clip of the person saying that line. Doing this per segment, per speaker, takes care of the entire speech track of the video.

### Generate the images

Then I switch gears to visuals. I use the [Nano Banana 2](https://replicate.com/google/nano-banana-2) model on [Replicate](https://replicate.com) to generate stylized images of each person. I provide a photo of the person plus a secondary reference image that represents the art style I want. Together, those two inputs let the model produce a new stylized image of the person in that style. This is where I lean hard on the show-me-your-work loop: I generate many candidates across a spread of styles, review them in a local gallery, and pick the best one for each segment.

### Lip-sync the talking heads

Now I have, for each segment, a stylized image and a speech audio clip. I feed both into a lip-sync model (I use [VEED Fabric 1.0](https://replicate.com/veed/fabric-1.0)), which combines the still image and the audio into a talking-head video where the person appears to speak the line. Run across all the segments, this gives me a series of deepfake video clips.

### Add captions

With the clips generated, it's time to caption them, so the content reads even when the video is watched without sound on social media. To make the captions visually engaging, I use a tool called [nice-ass-captions](https://github.com/zeke/nice-ass-captions). The name sounds like a joke, but [ASS](https://en.wikipedia.org/wiki/SubStation_Alpha#Advanced_SubStation_Alpha) is a real subtitle format. It generates word-by-word captions whose background and text colors are derived from the colors inside each video itself, so the captions thematically and visually match the clip they're burned into. The word timing comes from [whisper.cpp](https://github.com/ggml-org/whisper.cpp). Now each segment is a captioned video.

### Build the intro and outro

Next I want an intro animation and an outro animation. For this I use [Remotion](https://www.remotion.dev/), and I install an [agent skill](https://opencode.ai/docs/skills/) that helps the agent use Remotion effectively. Remotion lets you write code that generates a video, which can then be exported to MP4 or other formats. I describe the intro I want in natural language: a blank screen with a background color sampled from the first segment, then an animation where two logos each emerge from an invisible slit in the center of the screen and slide apart, with a faint arrow fading in between them. That description is enough for the agent to write the Remotion code and render the clip. For the outro, I play the intro in reverse, so the whole video loops cleanly when it autoplays.

### Generate background music

I also want a song for the background. I ask the agent to help me write a prompt for a song generation tool, aiming for something whimsical and homemade that works as a musical bed under the video. I use [Suno](https://suno.com) for this. Suno doesn't have an API, so I go to its website and manually paste in prompts until I get a result I like. This is the only part of the whole process where I leave my agent session and browser to use a separate product.

### Stitch it all together

Now I have an intro, a set of captioned segments, an outro, and a background track. I ask the agent to use [ffmpeg](https://ffmpeg.org) to combine everything into one video and show it to me. ffmpeg is the workhorse that concatenates the clips, lays the music underneath, and produces the final file.

### Share it

Once I have a final video I'm happy with, I ask the agent to use [Typefully](https://typefully.com) to create a draft for sharing it. This is a back-and-forth: we settle on the tone of the post and decide whether it should be a single short post or a multi-part thread. Typefully's [API](https://typefully.com/docs/api) accepts media uploads, so the agent can attach the video directly to the draft, ready to post across multiple platforms at once, including [X](https://x.com), [LinkedIn](https://www.linkedin.com), [Threads](https://www.threads.net), and [Bluesky](https://bsky.app).

That's the whole flow, script to share, mostly in one place, with the agent doing the orchestration and me steering by looking at the work as it comes.
