# Portail

An experiment in AI-driven UX - A dynamic, AI-generated web experience powered by OpenAI.

## 🌟 What is Portail?

Portail is a unique single-page application (SPA) that creates entirely AI-generated content experiences. Every visit generates completely new and unique content, navigation, and interactions using OpenAI's GPT models.

## ✨ Features

- **Dynamic Content Generation**: All UI, content, and links are generated in real-time
- **Completely Unique**: Each generation creates an entirely different experience
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
- **OpenAI Integration**: Uses the Chat Completions API (GPT-3.5-turbo)
- **Responsive Design**: Works on desktop and mobile devices
- **Metadata System**: Supports passing context between experiences via data attributes

### Metadata Feature

Portail now supports passing metadata between experiences to maintain continuity and context. This enables:

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
