#!/usr/bin/env python3
"""
Build script to generate an index/manifest of all podcast transcripts.
This creates a JSON file that the frontend can use for quick searching and browsing.
"""

import os
import json
import re
from pathlib import Path
import yaml

def parse_transcript_file(filepath):
    """Parse a transcript markdown file and extract YAML frontmatter and content."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract YAML frontmatter
    frontmatter_match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)

    if not frontmatter_match:
        return None

    frontmatter_text = frontmatter_match.group(1)
    transcript_content = frontmatter_match.group(2)

    try:
        metadata = yaml.safe_load(frontmatter_text)
    except yaml.YAMLError as e:
        print(f"Error parsing YAML in {filepath}: {e}")
        return None

    # Extract first few lines of transcript as preview
    transcript_lines = transcript_content.strip().split('\n')
    preview_lines = []
    for line in transcript_lines[2:]:  # Skip title and ## Transcript
        if line.strip() and len(preview_lines) < 3:
            preview_lines.append(line.strip())
        if len(preview_lines) >= 3:
            break

    preview = ' '.join(preview_lines)[:300] + '...'

    return {
        'metadata': metadata,
        'preview': preview,
        'transcript_length': len(transcript_content)
    }

def build_index():
    """Build the complete index of all transcripts."""
    episodes_dir = Path(__file__).parent / 'episodes'

    if not episodes_dir.exists():
        print(f"Error: Episodes directory not found at {episodes_dir}")
        return

    index = []
    all_keywords = set()

    # Iterate through all episode directories
    episode_dirs = sorted([d for d in episodes_dir.iterdir() if d.is_dir()])

    print(f"Processing {len(episode_dirs)} episode directories...")

    for episode_dir in episode_dirs:
        transcript_file = episode_dir / 'transcript.md'

        if not transcript_file.exists():
            print(f"Warning: No transcript.md found in {episode_dir.name}")
            continue

        parsed = parse_transcript_file(transcript_file)

        if not parsed:
            print(f"Warning: Could not parse {episode_dir.name}/transcript.md")
            continue

        metadata = parsed['metadata']

        # Build episode entry
        episode_entry = {
            'slug': episode_dir.name,
            'guest': metadata.get('guest', 'Unknown'),
            'title': metadata.get('title', 'Untitled'),
            'youtube_url': metadata.get('youtube_url', ''),
            'video_id': metadata.get('video_id', ''),
            'description': metadata.get('description', '').strip(),
            'duration': metadata.get('duration', ''),
            'duration_seconds': metadata.get('duration_seconds', 0),
            'view_count': metadata.get('view_count', 0),
            'keywords': metadata.get('keywords', []),
            'preview': parsed['preview'],
            'transcript_path': f'episodes/{episode_dir.name}/transcript.md',
            'transcript_length': parsed['transcript_length']
        }

        index.append(episode_entry)

        # Collect all unique keywords
        for keyword in episode_entry['keywords']:
            all_keywords.add(keyword)

    # Sort index by view count (descending)
    index.sort(key=lambda x: x['view_count'], reverse=True)

    # Create the final index object
    index_data = {
        'total_episodes': len(index),
        'last_updated': None,  # Could add timestamp here
        'all_keywords': sorted(list(all_keywords)),
        'episodes': index
    }

    # Write to JSON file
    output_path = Path(__file__).parent / 'frontend' / 'data' / 'index.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Index built successfully!")
    print(f"  - Total episodes: {len(index)}")
    print(f"  - Unique keywords: {len(all_keywords)}")
    print(f"  - Output: {output_path}")
    print(f"\nTop 5 most viewed episodes:")
    for i, ep in enumerate(index[:5], 1):
        print(f"  {i}. {ep['guest']} - {ep['view_count']:,} views")

if __name__ == '__main__':
    build_index()
