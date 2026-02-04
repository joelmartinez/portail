# Metadata Passing Feature

## Overview

The metadata passing feature allows AI-generated experiences to pass context, state, and custom data to subsequent experiences. This enables continuity, stat tracking, choice memory, and personalized experiences.

## Implementation Details

### Core Functions

1. **extractMetadataFromHTML(html)**
   - Extracts static metadata from HTML using the `data-metadata` attribute
   - Expects a JSON object in the attribute value
   - Returns an empty object if no metadata found or invalid JSON
   - Logs warnings for invalid JSON to aid debugging

2. **collectInteractionMetadata(element, parentMetadata)**
   - Collects metadata from user interactions with elements
   - Gathers all `data-*` attributes from the clicked element
   - Attempts to parse values as JSON; falls back to strings
   - Tracks interaction count and type
   - Merges with parent metadata

3. **formatMetadataForPrompt(metadata)**
   - Formats metadata into a readable string for AI prompts
   - Creates a bulleted list of key-value pairs
   - Provides context to the AI about how to use the metadata

### Data Flow

```
User Interaction
    ↓
Collect data-* attributes from element
    ↓
Merge with parent experience metadata
    ↓
Format for AI prompt
    ↓
Generate new experience with context
    ↓
Extract metadata from new experience
    ↓
Store in history with contextId
    ↓
Pass to next interaction
```

## Usage Examples

### Static Metadata

Embed state in your experience using `data-metadata`:

```html
<div data-metadata='{"theme":"fantasy","level":1,"playerClass":"warrior","health":100}'>
    <h3>Quest Beginning</h3>
    <p>You stand at the entrance to the Dark Forest...</p>
</div>
```

### Dynamic Metadata on Interactions

Add custom attributes to interactive elements:

```html
<!-- RPG Choices -->
<button data-choice="recruit" data-character="warrior" data-strength="10" data-defense="8">
    Recruit Warrior
</button>

<!-- Location Navigation -->
<a href="#" data-location="dungeon" data-danger-level="5" data-rewards='["gold","sword"]'>
    Explore Dungeon
</a>

<!-- Shop Interaction -->
<button data-action="buy" data-item="potion" data-cost="15" data-effect="heal">
    Buy Health Potion (15 gold)
</button>
```

## Use Cases

### 1. RPG Stat Tracking
Track player stats across experiences:
- Health, mana, gold
- Inventory items
- Character attributes
- Equipment

### 2. Story Choice Memory
Remember previous choices:
- Which NPCs were recruited
- Which paths were taken
- Which items were collected
- Moral alignment choices

### 3. Progress Tracking
Keep track of player progress:
- Visited locations
- Completed quests
- Unlocked areas
- Achievement flags

### 4. Game State
Maintain game state:
- Current level/difficulty
- Time elapsed
- Score/points
- Status effects

## Benefits

1. **Continuity**: Experiences feel connected and coherent
2. **Personalization**: AI generates content based on user's specific context
3. **Complexity**: Enables complex, stateful experiences like RPGs
4. **Memory**: System remembers choices and consequences
5. **Flexibility**: Optional - works with or without metadata

## Technical Notes

- Metadata is optional - experiences work fine without it
- Invalid JSON in `data-metadata` is logged but doesn't break the experience
- All `data-*` attributes except `data-action-type` and `data-alert-message` are collected
- Metadata is stored in browser history for navigation
- Parent metadata is merged with new interaction metadata
- AI prompts include formatted metadata for context-aware generation

## Files Modified

- `app.js`: Core implementation (3 new functions, updated existing functions)
- `README.md`: Documentation of the feature
- `test-metadata.html`: Examples and test cases

## Testing

See `test-metadata.html` for comprehensive examples of:
- Static metadata usage
- Dynamic metadata on buttons and links
- RPG stat tracking
- Story choices
- Location/progress tracking
