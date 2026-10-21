import urllib.request, re

url = 'https://vidmoly.org/embed-sho9jci39muy.html'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://vidmoly.org/'})
try:
    html = urllib.request.urlopen(req, timeout=30).read().decode()
    print('HTML length:', len(html))
    m = re.search(r'<title>([^<]+)</title>', html)
    if m: print('Title:', m.group(1))
    patterns = [
        r'sources\s*:\s*\[\s*\{[^}]*?file\s*:\s*["\']([^"\']+)["\']',
        r'file\s*:\s*["\'](https?:[^"\']+\.m3u8[^"\']*)["\']',
        r'["\'](https?:[^"\']+/master\.m3u8[^"\']*)["\']',
    ]
    for p in patterns:
        m = re.search(p, html)
        if m:
            print('Stream:', m.group(1)[:120])
            break
    m = re.search(r'image\s*:\s*["\']([^"\']+)["\']', html)
    if m: print('Poster:', m.group(1))
except Exception as e:
    print('Error:', e)