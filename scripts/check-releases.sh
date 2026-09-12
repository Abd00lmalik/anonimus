#!/bin/bash
curl -sL 'https://api.github.com/repos/midnightntwrk/compact/releases' | python3 -c "
import sys, json
data = json.loads(sys.stdin.read())
for r in data[:10]:
    pre = 'pre' if r['prerelease'] else 'stable'
    print(f'{r[\"tag_name\"]} ({pre})')
"
