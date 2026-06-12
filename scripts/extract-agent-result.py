#!/usr/bin/env python3
"""Pull the final assistant text from a subagent JSONL transcript and save it.

   python3 scripts/extract-agent-result.py <transcript.jsonl> <out.md>
"""
import json
import sys

src, dst = sys.argv[1], sys.argv[2]

last_text = None
with open(src) as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        # transcript entries vary; look for assistant messages with text content
        msg = obj.get('message') if isinstance(obj, dict) else None
        if not isinstance(msg, dict):
            msg = obj if isinstance(obj, dict) else {}
        role = msg.get('role') or obj.get('role')
        if role != 'assistant':
            continue
        content = msg.get('content') or obj.get('content')
        texts = []
        if isinstance(content, str):
            texts.append(content)
        elif isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get('type') == 'text':
                    texts.append(part.get('text', ''))
        if texts:
            last_text = '\n'.join(texts)

if not last_text:
    sys.exit(f'no assistant text found in {src}')

with open(dst, 'w') as f:
    f.write(last_text + '\n')
print(f'saved {dst} ({len(last_text)} chars)')
