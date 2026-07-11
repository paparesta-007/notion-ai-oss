export interface ContentBlock {
  type: "paragraph" | "heading2" | "heading3" | "code" | "list" | "alert";
  content: string | string[]; // string for headings/paragraphs/code, string[] for list items
  language?: string; // language for syntax highlighting in code blocks
  alertType?: "info" | "warning" | "success"; // type for alert styling
}

export interface TutorialPage {
  id: string;
  title: string;
  category: string;
  description: string;
  blocks: ContentBlock[];
}

export interface TutorialCategory {
  id: string;
  title: string;
  pages: { id: string; title: string }[];
}

export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  {
    id: "get-started",
    title: "Get started",
    pages: [
      { id: "overview", title: "Overview" },
      { id: "quickstart", title: "Quickstart" },
      { id: "environment", title: "Environment variables" },
    ],
  },
  {
    id: "notion-integration",
    title: "Notion Integration",
    pages: [
      { id: "notion-developer", title: "Create Notion Integration" },
      { id: "notion-oauth", title: "OAuth redirection setup" },
    ],
  },
  {
    id: "model-configuration",
    title: "Model Config",
    pages: [
      { id: "openrouter-api", title: "OpenRouter setup" },
      { id: "model-switching", title: "Switching models" },
    ],
  },
  {
    id: "deployment",
    title: "Deployment",
    pages: [
      { id: "vercel-deploy", title: "Deploy on Vercel" },
      { id: "docker-setup", title: "Docker setup" },
    ],
  },
];

export const TUTORIAL_PAGES: Record<string, TutorialPage> = {
  overview: {
    id: "overview",
    title: "Overview",
    category: "Get started",
    description: "Discover what NotionAI OSS is, how it works, and how it compares to the proprietary subscription model.",
    blocks: [
      {
        type: "paragraph",
        content: "NotionAI OSS is a fully open-source, self-hostable alternative to the premium Notion AI subscription. Instead of paying a high monthly flat fee ($10 to $20 per month) for predefined AI services, NotionAI OSS connects directly to OpenRouter, allowing you to pay exactly for the tokens you consume.",
      },
      {
        type: "alert",
        content: "On average, active users spend less than $1.00 per month using Gemini 2.5 Flash or Claude 3.5 Haiku via OpenRouter, making this setup roughly 90-95% cheaper than official Notion AI.",
        alertType: "info",
      },
      {
        type: "heading2",
        content: "How it works under the hood",
      },
      {
        type: "paragraph",
        content: "The application acts as a proxy bridge between your browser, the official Notion API, and OpenRouter. When you perform a search, query your workspace, or request page highlights:",
      },
      {
        type: "list",
        content: [
          "NotionAI OSS fetches pages and databases directly from Notion servers using your private OAuth token.",
          "It extracts the text contents, cleans up metadata, and creates a prompt containing the workspace context.",
          "It streams the query to OpenRouter using your private API key and custom AI model settings.",
          "The assistant response streams back directly to your chat interface in real time.",
        ],
      },
      {
        type: "heading2",
        content: "Core features",
      },
      {
        type: "heading3",
        content: "1. Pay-per-token model",
      },
      {
        type: "paragraph",
        content: "Official subscriptions force you to pay a flat fee regardless of whether you make 5 queries or 500 queries. NotionAI OSS queries model providers directly, charging only a fraction of a cent per request.",
      },
      {
        type: "heading3",
        content: "2. Absolute model choice",
      },
      {
        type: "paragraph",
        content: "Unlike the official closed integration which locks you into a single LLM version, OpenRouter provides access to over 40 major AI models including Claude 3.7 Sonnet, GPT-4o, Gemini 2.5 Flash, Llama 3.3, and DeepSeek-V3. You can switch models on-the-fly depending on your speed and reasoning needs.",
      },
      {
        type: "heading3",
        content: "3. Complete data privacy",
      },
      {
        type: "paragraph",
        content: "Your prompts and Notion files are processed locally on your server. We never log, store, or sell any of your workspace queries, ensuring full GDPR compliance and peace of mind.",
      },
    ],
  },
  quickstart: {
    id: "quickstart",
    title: "Quickstart",
    category: "Get started",
    description: "Get NotionAI OSS up and running on your local machine in under three minutes.",
    blocks: [
      {
        type: "paragraph",
        content: "Follow this guide to download, install, and execute the project locally. Before starting, make sure you have Node.js (v18+) and npm installed.",
      },
      {
        type: "heading2",
        content: "Step 1: Clone the repository",
      },
      {
        type: "paragraph",
        content: "First, clone the source files from GitHub and install all required project dependencies:",
      },
      {
        type: "code",
        content: "git clone https://github.com/your-username/notion-ai-oss.git\ncd notion-ai-oss\nnpm install",
        language: "bash",
      },
      {
        type: "heading2",
        content: "Step 2: Create environment variables",
      },
      {
        type: "paragraph",
        content: "Create a local environment configuration file by copying the template. Open the file and insert your API keys.",
      },
      {
        type: "code",
        content: "cp .env.example .env.local",
        language: "bash",
      },
      {
        type: "alert",
        content: "At minimum, you need to populate the OPENROUTER_API_KEY. If you don't have OAuth credentials configured yet, the app will run in sandbox mode with mock data.",
        alertType: "warning",
      },
      {
        type: "heading2",
        content: "Step 3: Run the developer server",
      },
      {
        type: "paragraph",
        content: "Launch the local development server using next dev:",
      },
      {
        type: "code",
        content: "npm run dev",
        language: "bash",
      },
      {
        type: "paragraph",
        content: "Open your browser and navigate to http://localhost:3000. You should see the login interface. Click 'Continue' to enter sandbox mode or authenticate with Notion.",
      },
    ],
  },
  environment: {
    id: "environment",
    title: "Environment variables",
    category: "Get started",
    description: "Learn how to configure your .env.local variables to unlock all features of NotionAI OSS.",
    blocks: [
      {
        type: "paragraph",
        content: "NotionAI OSS uses environment variables to configure authentication, session storage, and external AI communication. Create a file named .env.local at the root directory of your project.",
      },
      {
        type: "heading2",
        content: "Configuration options",
      },
      {
        type: "heading3",
        content: "OPENROUTER_API_KEY",
      },
      {
        type: "paragraph",
        content: "The API key from openrouter.ai. This key is used to authenticate requests to all supported LLM models. Example:",
      },
      {
        type: "code",
        content: "OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx",
        language: "env",
      },
      {
        type: "heading3",
        content: "SESSION_SECRET",
      },
      {
        type: "paragraph",
        content: "A random 32-character string used to sign cookies and preserve secure user sessions. Do not share this key in public environments.",
      },
      {
        type: "code",
        content: "SESSION_SECRET=a_very_secure_random_32_char_secret_phrase",
        language: "env",
      },
      {
        type: "heading3",
        content: "NOTION_CLIENT_ID & NOTION_CLIENT_SECRET",
      },
      {
        type: "paragraph",
        content: "Required for production OAuth integrations. These credentials enable users to log in securely using their real Notion workspaces. See the 'Create Notion Integration' guide for details.",
      },
      {
        type: "code",
        content: "NOTION_CLIENT_ID=your_client_id\nNOTION_CLIENT_SECRET=your_client_secret",
        language: "env",
      },
    ],
  },
  "notion-developer": {
    id: "notion-developer",
    title: "Create Notion Integration",
    category: "Notion Integration",
    description: "Detailed step-by-step guide to setting up a public integration in the Notion Developer Portal to enable multi-workspace access.",
    blocks: [
      {
        type: "paragraph",
        content: "To allow NotionAI OSS to securely read and communicate with your Notion pages, you must register a public integration. Notion categorizes connections into two types: 'Internal' (restricted to one workspace, static token) and 'Public' (uses OAuth 2.0, allows any user to log in and select pages). We will set up a Public Connection.",
      },
      {
        type: "heading2",
        content: "Step 1: Access the Integrations Portal",
      },
      {
        type: "paragraph",
        content: "Go to the Notion Developer Portal at https://developers.notion.com and click 'My integrations' in the top right header. Log in with your Notion account credentials.",
      },
      {
        type: "heading2",
        content: "Step 2: Create a New Integration",
      },
      {
        type: "list",
        content: [
          "Click the '+ New integration' card.",
          "Select the default workspace that you want to associate this developer project with.",
          "Enter an integration name, for example: 'NotionAI OSS'.",
          "Upload an optional logo (you can use a custom icon to make it look like a native Notion extension).",
          "Click the 'Submit' button at the bottom of the page to save the draft.",
        ],
      },
      {
        type: "heading2",
        content: "Step 3: Configure Capabilities",
      },
      {
        type: "paragraph",
        content: "By default, integrations have limited permissions. Navigate to the 'Capabilities' tab in the left sidebar menu of your integration and verify/enable the following settings:",
      },
      {
        type: "list",
        content: [
          "Content Capabilities: Check 'Read content', 'Update content', and 'Insert content' (required to read/write pages).",
          "Comment Capabilities: Check 'Read comments' and 'Insert comments' (optional, if you want AI to interact with comments).",
          "User Capabilities: Select 'Read user information (without email)' to allow retrieving basic profile initials.",
          "Save changes before leaving the page.",
        ],
      },
      {
        type: "heading2",
        content: "Step 4: Enable Public Distribution (OAuth)",
      },
      {
        type: "paragraph",
        content: "This is the most critical step. Without public distribution, Notion will not allow standard OAuth authentication.",
      },
      {
        type: "list",
        content: [
          "Navigate to the 'Distribution' settings tab in the left menu.",
          "Toggle the switch 'Make integration public' to 'Yes'.",
          "Fill out the required developer metadata (Company Name, Website, Privacy Policy, Terms). If you are hosting locally for personal use, you can fill in dummy/mock details (e.g. your personal GitHub profile website URL).",
          "Double-check that redirect URIs are left blank for now (we will set them in the next step).",
          "Click 'Submit' at the bottom to transition the integration from Internal to Public.",
        ],
      },
      {
        type: "alert",
        content: "Once distribution is enabled, Notion will show your 'Client ID' and 'Client Secret' in the Credentials tab. These keys will be used in your local env file to authenticate authentication requests.",
        alertType: "success",
      },
    ],
  },
  "notion-oauth": {
    id: "notion-oauth",
    title: "OAuth redirection setup",
    category: "Notion Integration",
    description: "Learn how to configure OAuth callback redirects in both the Notion Developer portal and your local app environment.",
    blocks: [
      {
        type: "paragraph",
        content: "An OAuth callback redirect guarantees that authorization tokens are sent back securely to your running application instead of unauthorized servers. Notion enforces matching redirect URLs.",
      },
      {
        type: "heading2",
        content: "Step 1: Set Redirect URI in Notion Portal",
      },
      {
        type: "paragraph",
        content: "Open your integration settings in the Notion Developer portal, go to the 'Distribution' section, find the 'Redirect URIs' field, and add the local development callback address:",
      },
      {
        type: "code",
        content: "http://localhost:3000/api/auth/callback/notion",
        language: "text",
      },
      {
        type: "alert",
        content: "Ensure the redirect URI starts exactly with 'http://localhost' for local development, or uses 'https://' for production deployments. Notion requires HTTPS for all remote domains.",
        alertType: "warning",
      },
      {
        type: "heading2",
        content: "Step 2: Add Keys to .env.local",
      },
      {
        type: "paragraph",
        content: "Open the .env.local file in the root of your NotionAI OSS workspace, and insert the Client ID and Client Secret generated in the previous guide:",
      },
      {
        type: "code",
        content: "NOTION_CLIENT_ID=your_notion_client_id_here\nNOTION_CLIENT_SECRET=your_notion_client_secret_here\nSESSION_SECRET=create_a_random_32_character_session_key",
        language: "env",
      },
      {
        type: "heading2",
        content: "Step 3: Test the Authorization Flow",
      },
      {
        type: "paragraph",
        content: "When you visit your app and click 'Log in' or 'Get started':",
      },
      {
        type: "list",
        content: [
          "The app redirects you to Notion's secure login panel.",
          "You log in and select the Notion workspace pages you want to grant the integration permission to access.",
          "Notion prompts you to click 'Allow access'.",
          "Notion redirects back to http://localhost:3000/api/auth/callback/notion with an authorization code parameter.",
          "Your backend intercepts this code and exchanges it securely for a workspace access token (via POST to https://api.notion.com/v1/oauth/token).",
          "The session is encrypted and stored in your browser cookie, redirecting you into the workspace chatbot interface.",
        ],
      },
    ],
  },
  "openrouter-api": {
    id: "openrouter-api",
    title: "OpenRouter setup",
    category: "Model Config",
    description: "Create an OpenRouter account, obtain keys, and manage token expenditure limits.",
    blocks: [
      {
        type: "paragraph",
        content: "OpenRouter aggregates API access for top LLMs under a unified API endpoint. You only pay for what you query.",
      },
      {
        type: "heading2",
        content: "1. Create an OpenRouter account",
      },
      {
        type: "paragraph",
        content: "Visit https://openrouter.ai and sign up using your email or Google account.",
      },
      {
        type: "heading2",
        content: "2. Fund your API wallet",
      },
      {
        type: "paragraph",
        content: "Navigate to the Credits tab. OpenRouter is pre-funded; deposit a small amount (e.g. $5.00) using credit card or crypto. This balance will last for months of personal usage.",
      },
      {
        type: "heading2",
        content: "3. Generate an API key",
      },
      {
        type: "paragraph",
        content: "Go to the API Keys menu, click 'Create Key', choose a name, and save the key into your local env configuration.",
      },
    ],
  },
  "model-switching": {
    id: "model-switching",
    title: "Switching models",
    category: "Model Config",
    description: "Learn how to choose the right AI model for your workspace queries and tasks.",
    blocks: [
      {
        type: "paragraph",
        content: "Depending on your task, you can switch between models directly inside the sidebar dropdown of the NotionAI OSS workspace.",
      },
      {
        type: "heading2",
        content: "Recommended Models",
      },
      {
        type: "list",
        content: [
          "claude-3-7-sonnet: Best for complex writing, coding assistance, and high-precision document editing.",
          "gemini-2-5-flash: Extremely fast and cheap. Ideal for search queries and summaries.",
          "gpt-4o: General-purpose reasoning and highly accurate answers.",
          "llama-3.3-70b-instruct: Highly capable, cost-efficient open weights model.",
        ],
      },
    ],
  },
  "vercel-deploy": {
    id: "vercel-deploy",
    title: "Deploy on Vercel",
    category: "Deployment",
    description: "One-click deployment to Vercel with serverless scaling and zero configuration.",
    blocks: [
      {
        type: "paragraph",
        content: "Vercel is the easiest place to host Next.js apps. Deployment takes less than two minutes.",
      },
      {
        type: "heading2",
        content: "Deployment steps",
      },
      {
        type: "list",
        content: [
          "Push your local repository to GitHub, GitLab, or Bitbucket.",
          "Import your repository into the Vercel Dashboard.",
          "Under Environment Variables, add all variables defined in your .env.local file.",
          "Click 'Deploy'.",
        ],
      },
    ],
  },
  "docker-setup": {
    id: "docker-setup",
    title: "Docker setup",
    category: "Deployment",
    description: "Containerize NotionAI OSS for deployment on Kubernetes, AWS, or local self-hosted infrastructure.",
    blocks: [
      {
        type: "paragraph",
        content: "A Dockerfile is provided at the root of the project to compile and run the application inside a lightweight Node image.",
      },
      {
        type: "heading2",
        content: "Build and run commands",
      },
      {
        type: "code",
        content: "docker build -t notion-ai-oss .\ndocker run -p 3000:3000 --env-file .env.local notion-ai-oss",
        language: "bash",
      },
    ],
  },
};
