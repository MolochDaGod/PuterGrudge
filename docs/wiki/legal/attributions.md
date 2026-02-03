# Attributions & Licenses

**CloudPilot AI Studio**  
**Last Updated:** January 11, 2025

This document lists all third-party services, libraries, and resources used in CloudPilot AI Studio with their respective licenses and attributions.

---

## Core Infrastructure

### Puter.js SDK
- **Provider:** [Puter](https://puter.com)
- **Purpose:** Cloud infrastructure, AI models, storage, hosting
- **License:** Apache 2.0
- **Website:** https://js.puter.com/v2/

Key features provided:
- 500+ free AI models
- Cloud file system (`puter.fs`)
- Key-value storage (`puter.kv`)
- Serverless workers (`puter.worker`)
- Static hosting (`puter.hosting`)
- User authentication (`puter.auth`)

---

## AI Model Providers

Models accessed through Puter.js include:

### OpenAI
- **Models:** GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Website:** https://openai.com
- **Terms:** https://openai.com/policies/terms-of-use

### Anthropic
- **Models:** Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Website:** https://anthropic.com
- **Terms:** https://anthropic.com/legal/aup

### Google
- **Models:** Gemini Pro, Gemini Ultra
- **Website:** https://ai.google.dev
- **Terms:** https://ai.google.dev/terms

### Meta
- **Models:** Llama 2, Llama 3
- **Website:** https://llama.meta.com
- **License:** Llama 2 Community License

### Mistral AI
- **Models:** Mistral 7B, Mistral Medium, Mistral Large
- **Website:** https://mistral.ai
- **License:** Apache 2.0

---

## NPM Packages

### Runtime Dependencies

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| express | ^4.x | MIT | Web framework |
| typescript | ^5.x | Apache-2.0 | Type system |
| drizzle-orm | ^0.x | Apache-2.0 | Database ORM |
| zod | ^3.x | MIT | Schema validation |
| ws | ^8.x | MIT | WebSocket support |
| uuid | ^9.x | MIT | Unique identifiers |
| axios | ^1.x | MIT | HTTP client |
| sharp | ^0.x | Apache-2.0 | Image processing |
| framer-motion | ^10.x | MIT | Animations |
| zustand | ^4.x | MIT | State management |

### Frontend Dependencies

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| react | ^18.x | MIT | UI framework |
| react-dom | ^18.x | MIT | DOM rendering |
| wouter | ^3.x | ISC | Routing |
| @tanstack/react-query | ^5.x | MIT | Data fetching |
| tailwindcss | ^3.x | MIT | CSS framework |
| lucide-react | ^0.x | ISC | Icons |
| @radix-ui/* | various | MIT | UI primitives |

### Security Dependencies

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| helmet | ^7.x | MIT | HTTP headers |
| compression | ^1.x | MIT | Response compression |

### Development Dependencies

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| vite | ^5.x | MIT | Build tool |
| esbuild | ^0.x | MIT | Bundler |
| tsx | ^4.x | MIT | TypeScript execution |
| drizzle-kit | ^0.x | Apache-2.0 | Database migrations |

---

## Free API Resources

### Image APIs

| Service | License | Attribution Required |
|---------|---------|---------------------|
| Unsplash | Unsplash License | Yes - Link to photographer |
| Pexels | Pexels License | No - But appreciated |
| Pixabay | Pixabay License | No |

**Unsplash Attribution Example:**
```
Photo by [Photographer Name] on Unsplash
```

### Font APIs

| Service | License | Attribution |
|---------|---------|-------------|
| Google Fonts | SIL Open Font License | Varies by font |

### Video APIs

| Service | License | Attribution |
|---------|---------|-------------|
| Pexels Video | Pexels License | No - But appreciated |

---

## Icons & Assets

### Lucide Icons
- **License:** ISC
- **Website:** https://lucide.dev
- **Usage:** UI icons throughout application

### React Icons
- **License:** MIT
- **Website:** https://react-icons.github.io/react-icons/
- **Usage:** Company logos (Si* icons)

---

## Hosting & Deployment

### Puter Hosting
- **Service:** Static site hosting
- **Domain:** `*.puter.site`
- **Terms:** Puter Terms of Service

### Vercel (Optional)
- **License:** Vercel Terms
- **Website:** https://vercel.com

### Netlify (Optional)
- **License:** Netlify Terms
- **Website:** https://netlify.com

---

## Documentation

### Markdown Processing
- **Libraries:** Various MIT-licensed markdown processors

### Syntax Highlighting
- **Libraries:** Prism.js (MIT), highlight.js (BSD-3-Clause)

---

## Acknowledgments

Special thanks to:

- **Puter Team** - For providing free cloud infrastructure and AI access
- **Open Source Community** - For the libraries that power this project
- **AI Research Labs** - For advancing AI capabilities

---

## License Compliance

All dependencies are used in compliance with their respective licenses. This project:

1. Includes license notices as required
2. Provides attribution where required
3. Does not modify licensed code unless permitted
4. Respects API usage terms

---

## Reporting Issues

If you believe any attribution is missing or incorrect:

- **Email:** legal@grudgeos.local
- **Admin:** grudgedev@gmail.com

---

**CloudPilot AI Studio**  
Built with Open Source
