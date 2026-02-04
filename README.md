# Portail

An experiment in AI-driven UX - A dynamic, AI-generated web experience powered by OpenAI.

## 🌟 What is Portail?

Portail is a unique single-page application (SPA) that creates entirely AI-generated content experiences. Every visit generates completely new and unique content, navigation, and interactions using OpenAI's GPT models.

## ✨ Features

- **Dynamic Content Generation**: All UI, content, and links are generated in real-time
- **Completely Unique**: Each generation creates an entirely different experience
- **Agentic Loop**: Multi-step planning and execution for complex experiences like games and interactive applications
- **Smart Status Updates**: Fun, entertaining messages that keep you engaged during generation
- **Increased Context**: Leverages larger context windows (up to 128K tokens) for richer, more detailed experiences
- **Client-Side Only**: Runs entirely in your browser - no server-side code
- **Privacy-Focused**: Your API key is never sent to our servers
- **Interactive**: Click generated links to explore AI-created content dynamically
- **Metadata Passing**: Experiences can pass context and state to subsequent experiences
- **GitHub Pages Ready**: Hosted as a static site

## 🚀 Live Demo

Visit [https://joelmartinez.github.io/portail/](https://joelmartinez.github.io/portail/) to try it out!

## 🔑 Requirements

You'll need:
- An OpenAI API key (get one at [platform.openai.com](https://platform.openai.com/api-keys))
- A modern web browser
- Internet connection

## ⚠️ Important Warnings

Before using Portail, please understand:
- You must provide your own OpenAI API key
- API usage will incur charges on your OpenAI account
- Your API key is stored only in browser memory during your session
- We strongly recommend reviewing the source code before providing your API key
- The developers are not liable for any API costs or generated content

## 🛠️ How It Works

1. **Warning Screen**: Read and acknowledge the warnings and liability waivers
2. **API Key Setup**: Enter your OpenAI API key (validated before use)
3. **Experience**: AI generates unique content with clickable links
4. **Navigate**: Click links to generate new related content dynamically
5. **Regenerate**: Create entirely new experiences at any time

## 💻 Local Development

To run locally:

```bash
# Clone the repository
git clone https://github.com/joelmartinez/portail.git
cd portail

# Serve locally (use any static server)
python -m http.server 8000
# or
npx serve

# Open in browser
open http://localhost:8000
```

## 🔒 Security & Privacy

- **No Server-Side Storage**: Your API key is never transmitted to our servers
- **Client-Side Only**: All AI requests go directly from your browser to OpenAI
- **No Tracking**: We don't collect any user data
- **Open Source**: Review the code yourself on GitHub

## 🏗️ Technical Details

- **Pure JavaScript**: No frameworks or build tools required
- **SPA Architecture**: All navigation is dynamic DOM manipulation
- **OpenAI Integration**: Uses the Chat Completions API with multiple model support
- **Agentic Loop**: Multi-step planning and execution system for complex experiences
- **Large Context Windows**: Supports up to 128K tokens for GPT-4o/GPT-4o-mini/GPT-4-turbo
- **Responsive Design**: Works on desktop and mobile devices
- **Metadata System**: Supports passing context between experiences via data attributes

### Agentic Loop Feature

Portail now includes an intelligent agentic loop that automatically detects complex experiences (games, forms, applications) and breaks generation into multiple planned steps:

- **Automatic Complexity Detection**: Identifies when multi-step generation is beneficial
- **Multi-Step Execution**: Complex experiences use 2-3 steps (foundation → features → polish)
- **Simple Experiences**: Still use efficient single-step generation
- **Fun Status Messages**: 32 entertaining messages across 4 phases keep users engaged
- **Step History**: Full tracking of each step with IDs and metadata
- **Continuity**: Each step builds upon previous steps for cohesive results

**Examples of complex experiences benefiting from multi-step:**
- Turn-based RPG battle systems
- Interactive forms with validation
- Management/simulation games
- Terminal interfaces
- Choose-your-own-adventure stories

See `AGENTIC_LOOP.md` for detailed documentation.

### Metadata Feature

Portail supports passing metadata between experiences to maintain continuity and context. This enables:

- **Static Metadata**: Embed state in HTML using `data-metadata` attributes with JSON objects
- **Dynamic Metadata**: Add custom `data-*` attributes to interactive elements (links, buttons)
- **Automatic Collection**: On interaction, all data attributes are collected and merged
- **AI Integration**: Metadata is formatted and passed to the AI prompt for context-aware generation

#### Example Usage

**Static metadata:**
```html
<div data-metadata='{"theme":"fantasy","level":1,"playerClass":"warrior"}'>
    <h3>Quest Beginning</h3>
    <p>You stand at the entrance to the Dark Forest...</p>
</div>
```

**Dynamic metadata on interactions:**
```html
<button data-choice="recruit" data-character="warrior" data-strength="10">
    Recruit Warrior
</button>
<a href="#" data-location="dungeon" data-danger-level="5">
    Explore Dungeon
</a>
```

When users interact with these elements, the metadata is automatically collected and passed to the next experience, allowing the AI to maintain continuity, track stats, remember choices, and create personalized experiences.

See `test-metadata.html` for more examples.

## 📝 Future Plans

- Support for additional AI providers (Anthropic, Google, etc.)
- Customizable generation parameters
- Save/share generated experiences
- Enhanced interactive elements

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with OpenAI's GPT models and hosted on GitHub Pages.
