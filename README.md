# ytsize
A tool for estimating the amount of storage required to archive a YouTube channel's videos.

## Installation
Requires [Bun](https://bun.sh/), install dependencies as follows.
```bash
bun install
```

## Usage

```bash
bun run index.ts [--streams] [--plugin PLUGIN_FILE] --channel CHANNEL_ID 
```
Providing the `--streams` flags works with archived streams instead of videos.
The `--plugin` flag offers the ability to specifiy a function for selecting the desired AV formats. Use `--gen-script-template` to generate a blank plugin file.

