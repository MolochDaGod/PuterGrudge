/**
 * Free API Resources Library for CloudPilot AI Agents
 * 
 * This module provides AI agents and automated development systems
 * with access to free APIs for:
 * - Fonts (Google Fonts)
 * - Images (Unsplash, Pexels, Pixabay)
 * - Video (Pexels, Pixabay)
 * - Serverless Functions
 * - Game Server Deployment
 * - AI/LLM APIs
 * 
 * NO CODING REQUIRED - Agents use these resources automatically
 */

export const FREE_API_RESOURCES = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),

  /**
   * FONTS - Google Fonts API
   * Free, unlimited, no API key required for CSS embedding
   */
  fonts: {
    googleFonts: {
      name: 'Google Fonts',
      baseUrl: 'https://fonts.googleapis.com',
      apiUrl: 'https://www.googleapis.com/webfonts/v1/webfonts',
      documentation: 'https://developers.google.com/fonts/docs/developer_api',
      requiresKey: false,
      
      topFonts2025: [
        { name: 'Inter', category: 'sans-serif', weights: [400, 500, 600, 700], useCase: 'UI design, body text' },
        { name: 'DM Sans', category: 'sans-serif', weights: [400, 500, 600, 700], useCase: 'Modern web apps' },
        { name: 'Montserrat', category: 'sans-serif', weights: [400, 500, 600, 700, 800], useCase: 'Headlines, creative' },
        { name: 'Space Grotesk', category: 'display', weights: [400, 500, 600, 700], useCase: 'Tech branding' },
        { name: 'Work Sans', category: 'sans-serif', weights: [400, 500, 600, 700], useCase: 'Versatile web design' },
        { name: 'JetBrains Mono', category: 'monospace', weights: [400, 500, 600, 700], useCase: 'Code, terminals' },
        { name: 'Roboto', category: 'sans-serif', weights: [400, 500, 700], useCase: 'Material design' },
        { name: 'Poppins', category: 'sans-serif', weights: [400, 500, 600, 700], useCase: 'Modern headings' },
        { name: 'Lato', category: 'sans-serif', weights: [400, 700], useCase: 'Professional, friendly' },
        { name: 'Fira Code', category: 'monospace', weights: [400, 500, 600, 700], useCase: 'Code with ligatures' },
      ],

      usage: {
        cssEmbed: (fontName, weights = [400, 700]) => 
          `<link href="https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@${weights.join(';')}&display=swap" rel="stylesheet">`,
        
        cssVariable: (fontName) => 
          `font-family: '${fontName}', sans-serif;`,
      }
    }
  },

  /**
   * STOCK IMAGES - Free high-quality photos
   */
  images: {
    unsplash: {
      name: 'Unsplash',
      baseUrl: 'https://api.unsplash.com',
      documentation: 'https://unsplash.com/developers',
      freeLimit: '50 requests/hour',
      requiresKey: true,
      keyEnvVar: 'UNSPLASH_ACCESS_KEY',
      
      endpoints: {
        random: '/photos/random',
        search: '/search/photos?query={query}',
        photo: '/photos/{id}',
      },
      
      usage: async (accessKey, query) => `
const response = await fetch('https://api.unsplash.com/search/photos?query=${query}', {
  headers: { 'Authorization': 'Client-ID ' + accessKey }
});
const data = await response.json();
return data.results.map(photo => photo.urls.regular);`
    },

    pexels: {
      name: 'Pexels',
      baseUrl: 'https://api.pexels.com/v1',
      documentation: 'https://www.pexels.com/api/',
      freeLimit: '200 requests/hour',
      requiresKey: true,
      keyEnvVar: 'PEXELS_API_KEY',
      
      endpoints: {
        search: '/search?query={query}',
        curated: '/curated',
        photo: '/photos/{id}',
      },
      
      usage: async (apiKey, query) => `
const response = await fetch('https://api.pexels.com/v1/search?query=${query}', {
  headers: { 'Authorization': apiKey }
});
const data = await response.json();
return data.photos.map(photo => photo.src.large);`
    },

    pixabay: {
      name: 'Pixabay',
      baseUrl: 'https://pixabay.com/api/',
      documentation: 'https://pixabay.com/api/docs/',
      freeLimit: '100 requests/minute',
      requiresKey: true,
      keyEnvVar: 'PIXABAY_API_KEY',
      
      usage: async (apiKey, query) => `
const response = await fetch('https://pixabay.com/api/?key=${apiKey}&q=${query}&image_type=photo');
const data = await response.json();
return data.hits.map(img => img.largeImageURL);`
    },

    loremPicsum: {
      name: 'Lorem Picsum',
      baseUrl: 'https://picsum.photos',
      documentation: 'https://picsum.photos/',
      freeLimit: 'Unlimited',
      requiresKey: false,
      
      usage: {
        random: (width, height) => `https://picsum.photos/${width}/${height}`,
        specific: (id, width, height) => `https://picsum.photos/id/${id}/${width}/${height}`,
        grayscale: (width, height) => `https://picsum.photos/${width}/${height}?grayscale`,
        blur: (width, height, blur = 2) => `https://picsum.photos/${width}/${height}?blur=${blur}`,
      }
    }
  },

  /**
   * STOCK VIDEO - Free video clips
   */
  video: {
    pexelsVideo: {
      name: 'Pexels Videos',
      baseUrl: 'https://api.pexels.com/videos',
      documentation: 'https://www.pexels.com/api/documentation/',
      freeLimit: '200 requests/hour',
      requiresKey: true,
      keyEnvVar: 'PEXELS_API_KEY',
      
      endpoints: {
        search: '/search?query={query}',
        popular: '/popular',
        video: '/videos/{id}',
      },
      
      usage: async (apiKey, query) => `
const response = await fetch('https://api.pexels.com/videos/search?query=${query}', {
  headers: { 'Authorization': apiKey }
});
const data = await response.json();
return data.videos.map(v => v.video_files[0].link);`
    },

    pixabayVideo: {
      name: 'Pixabay Videos',
      baseUrl: 'https://pixabay.com/api/videos/',
      documentation: 'https://pixabay.com/api/docs/',
      freeLimit: '100 requests/minute',
      requiresKey: true,
      keyEnvVar: 'PIXABAY_API_KEY',
      
      usage: async (apiKey, query) => `
const response = await fetch('https://pixabay.com/api/videos/?key=${apiKey}&q=${query}');
const data = await response.json();
return data.hits.map(v => v.videos.medium.url);`
    }
  },

  /**
   * SERVERLESS FUNCTIONS - Deploy code without servers
   */
  serverless: {
    puterHosting: {
      name: 'Puter Hosting',
      description: 'Free static site & app hosting via Puter.js',
      documentation: 'https://docs.puter.com/Hosting',
      freeLimit: 'Unlimited static sites',
      requiresKey: false,
      
      usage: `
// Deploy static site with Puter.js
await puter.hosting.create('my-app-name', '/path/to/files');

// Get hosted URL
const sites = await puter.hosting.list();
console.log(sites[0].subdomain + '.puter.site');`
    },

    vercel: {
      name: 'Vercel',
      description: 'Frontend cloud, serverless functions',
      documentation: 'https://vercel.com/docs',
      freeLimit: 'Unlimited deployments, 100GB bandwidth',
      requiresKey: true,
      keyEnvVar: 'VERCEL_TOKEN',
      
      features: ['Edge Functions', 'Serverless', 'Static Sites', 'Next.js optimized']
    },

    netlify: {
      name: 'Netlify',
      description: 'JAMstack hosting with functions',
      documentation: 'https://docs.netlify.com/',
      freeLimit: '100GB bandwidth, 300 build min/month',
      requiresKey: true,
      keyEnvVar: 'NETLIFY_AUTH_TOKEN',
      
      features: ['Serverless Functions', 'Forms', 'Identity', 'Large Media']
    },

    cloudflareWorkers: {
      name: 'Cloudflare Workers',
      description: 'Edge computing at 200+ locations',
      documentation: 'https://developers.cloudflare.com/workers/',
      freeLimit: '100,000 requests/day',
      requiresKey: true,
      keyEnvVar: 'CF_API_TOKEN',
      
      features: ['Edge Functions', 'KV Storage', 'Durable Objects', 'R2 Storage']
    },

    denoDepoloy: {
      name: 'Deno Deploy',
      description: 'Global edge runtime for Deno/JS',
      documentation: 'https://deno.com/deploy/docs',
      freeLimit: '100,000 requests/day',
      requiresKey: true,
      keyEnvVar: 'DENO_DEPLOY_TOKEN',
      
      features: ['Edge Functions', 'Fresh Framework', 'TypeScript native']
    }
  },

  /**
   * GAME SERVER DEPLOYMENT
   */
  gameServers: {
    puterMultiplayer: {
      name: 'Puter WebSocket Games',
      description: 'Host multiplayer games using Puter.js',
      documentation: 'https://docs.puter.com/',
      freeLimit: 'Unlimited for hosted apps',
      requiresKey: false,
      
      templates: [
        { name: 'WebSocket Chat', type: 'realtime', players: 'unlimited' },
        { name: 'Turn-Based Game', type: 'turnbased', players: '2-8' },
        { name: 'Collaborative Canvas', type: 'realtime', players: 'unlimited' },
      ],
      
      usage: `
// Create WebSocket server for games
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Broadcast to all players
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});`
    },

    flyio: {
      name: 'Fly.io',
      description: 'Global app deployment with WebSockets',
      documentation: 'https://fly.io/docs/',
      freeLimit: '3 shared VMs + 160GB transfer',
      requiresKey: true,
      keyEnvVar: 'FLY_API_TOKEN',
      
      features: ['WebSocket support', 'Global regions', 'Docker deploy', 'Persistent storage']
    },

    railway: {
      name: 'Railway',
      description: 'Deploy game servers with databases',
      documentation: 'https://docs.railway.app/',
      freeLimit: '$5 free credit/month',
      requiresKey: true,
      keyEnvVar: 'RAILWAY_TOKEN',
      
      features: ['PostgreSQL included', 'Redis available', 'Docker support', 'Custom domains']
    },

    render: {
      name: 'Render',
      description: 'Full-stack deployment with WebSockets',
      documentation: 'https://render.com/docs',
      freeLimit: '750 hours/month',
      requiresKey: true,
      keyEnvVar: 'RENDER_API_KEY',
      
      features: ['WebSocket support', 'PostgreSQL free', 'Redis free', 'Background workers']
    }
  },

  /**
   * AI/LLM APIs - Free tiers for AI features
   */
  ai: {
    puterAI: {
      name: 'Puter.js AI',
      description: 'FREE access to 500+ models via OpenRouter',
      documentation: 'https://docs.puter.com/AI',
      freeLimit: 'Unlimited (uses OpenRouter free models)',
      requiresKey: false,
      
      topModels: [
        'openrouter:meta-llama/llama-3.3-70b-instruct:free',
        'openrouter:deepseek/deepseek-r1:free',
        'openrouter:google/gemma-3-27b-it:free',
        'openrouter:qwen/qwen3-235b-a22b:free',
        'openrouter:mistralai/mistral-nemo:free',
      ],
      
      usage: `
// Simple chat - NO API KEY NEEDED
const response = await puter.ai.chat("Your prompt here", { 
  model: 'openrouter:meta-llama/llama-3.3-70b-instruct:free' 
});
console.log(response);`
    },

    googleAIStudio: {
      name: 'Google AI Studio',
      description: 'Gemini models with generous free tier',
      documentation: 'https://ai.google.dev/',
      freeLimit: '3M tokens/day (Gemini 2.5 Pro)',
      requiresKey: true,
      keyEnvVar: 'GOOGLE_AI_API_KEY',
      
      models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
    },

    groq: {
      name: 'Groq',
      description: 'Fastest inference for open models',
      documentation: 'https://console.groq.com/docs',
      freeLimit: 'Free tier available',
      requiresKey: true,
      keyEnvVar: 'GROQ_API_KEY',
      
      models: ['llama-3.3-70b', 'mixtral-8x7b', 'gemma-2-9b']
    }
  },

  /**
   * UTILITY APIS - Other useful free APIs
   */
  utilities: {
    restCountries: {
      name: 'REST Countries',
      baseUrl: 'https://restcountries.com/v3.1',
      freeLimit: 'Unlimited',
      requiresKey: false,
      endpoints: {
        all: '/all',
        byName: '/name/{name}',
        byCode: '/alpha/{code}',
      }
    },

    openWeather: {
      name: 'OpenWeatherMap',
      baseUrl: 'https://api.openweathermap.org/data/2.5',
      freeLimit: '1,000 calls/day',
      requiresKey: true,
      keyEnvVar: 'OPENWEATHER_API_KEY',
    },

    duckDuckGo: {
      name: 'DuckDuckGo Instant Answer',
      baseUrl: 'https://api.duckduckgo.com',
      freeLimit: 'Unlimited',
      requiresKey: false,
      usage: `fetch('https://api.duckduckgo.com/?q=query&format=json')`
    }
  }
};

/**
 * Get font embed code for a specific font
 */
export function getFontEmbed(fontName, weights = [400, 700]) {
  return `<link href="https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@${weights.join(';')}&display=swap" rel="stylesheet">`;
}

/**
 * Get placeholder image URL
 */
export function getPlaceholderImage(width, height, options = {}) {
  let url = `https://picsum.photos/${width}/${height}`;
  if (options.grayscale) url += '?grayscale';
  if (options.blur) url += `?blur=${options.blur}`;
  return url;
}

/**
 * Get recommended free API for a task
 */
export function getRecommendedAPI(task) {
  const recommendations = {
    font: FREE_API_RESOURCES.fonts.googleFonts,
    image: FREE_API_RESOURCES.images.loremPicsum,
    stockImage: FREE_API_RESOURCES.images.pexels,
    video: FREE_API_RESOURCES.video.pexelsVideo,
    hosting: FREE_API_RESOURCES.serverless.puterHosting,
    serverless: FREE_API_RESOURCES.serverless.cloudflareWorkers,
    gameServer: FREE_API_RESOURCES.gameServers.puterMultiplayer,
    ai: FREE_API_RESOURCES.ai.puterAI,
  };
  return recommendations[task] || null;
}

/**
 * Get all APIs that don't require an API key
 */
export function getFreeNoKeyAPIs() {
  const noKey = [];
  
  const scan = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object') {
        if (value.requiresKey === false) {
          noKey.push({ path: `${path}.${key}`, ...value });
        } else if (!value.requiresKey && !value.name) {
          scan(value, `${path}.${key}`);
        }
      }
    }
  };
  
  scan(FREE_API_RESOURCES);
  return noKey;
}

export default FREE_API_RESOURCES;
