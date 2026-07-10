import { Block } from "./types";

export const MOCK_PAGES = [
  {
    id: "mock-1",
    title: "Project Brainstorming & Mindmap",
    url: "https://notion.so",
    created: "2 days ago",
    last_edited: "2 hours ago",
    emoji: "💡",
  },
  {
    id: "mock-2",
    title: "Product Launch Roadmap v2.0",
    url: "https://notion.so",
    created: "1 week ago",
    last_edited: "Yesterday",
    emoji: "🚀",
  },
  {
    id: "mock-3",
    title: "Notion AI Integration Specifications",
    url: "https://notion.so",
    created: "2 weeks ago",
    last_edited: "3 days ago",
    emoji: null,
  },
  {
    id: "mock-4",
    title: "Team Weekly Standup Sync Notes",
    url: "https://notion.so",
    created: "3 days ago",
    last_edited: "5 mins ago",
    emoji: "🎯",
  },
  {
    id: "mock-5",
    title: "Marketing Copy & Creative Direction",
    url: "https://notion.so",
    created: "1 month ago",
    last_edited: "1 week ago",
    emoji: "✍️",
  },
];

export const MOCK_PAGE_CONTENTS: Record<string, { title: string; emoji: string | null; blocks: Block[] }> = {
  "mock-1": {
    title: "Project Brainstorming & Mindmap",
    emoji: "💡",
    blocks: [
      { type: "heading_1", content: "💡 Project Brainstorming & Mindmap" },
      { type: "paragraph", content: "This workspace is dedicated to sketching out early ideas for our new Notion AI agent integration. We aim to build a secure, fast, and feature-rich system." },
      { type: "heading_2", content: "🎯 Key Goals" },
      { type: "bulleted_list_item", content: "Establish a secure OAuth 2.0 gateway to Notion's API." },
      { type: "bulleted_list_item", content: "Create an encrypted local session cookie that expires in 3 days." },
      { type: "bulleted_list_item", content: "Render Notion's block structure natively in clean, responsive web formats." },
      {
        type: "table",
        content: "",
        has_column_header: true,
        rows: [
          ["Infrastructure Component", "Owner", "Status"],
          ["OAuth 2.0 Flow Gateway", "Tommaso", "Ready"],
          ["GCM Cryptography Provider", "Tommaso", "Ready"],
          ["Recursive Block Parser", "Sarah", "In Progress"],
        ]
      },
      { type: "heading_2", content: "📋 Action Items" },
      { type: "to_do", content: "Register OAuth integration in Notion developer portal", checked: true },
      { type: "to_do", content: "Verify GCM block cryptography on cookie store", checked: true },
      { type: "to_do", content: "Enable real-time collaborative workspace synchronization", checked: false },
      {
        type: "button",
        content: "",
        button_text: "Trigger Sync Event",
        button_icon: "⚡"
      },
      { type: "heading_2", content: "🔒 Security Instructions" },
      { type: "callout", content: "All user sessions are protected using hardware-accelerated AES-256-GCM encryption. Do not commit SESSION_SECRET keys to repository history." },
      { type: "heading_2", content: "📂 Workspace Roadmaps & Tasks Database" },
      {
        type: "child_database",
        content: "Project Roadmap Tasks",
        database_title: "Project Roadmap Tasks",
        database_columns: ["Name", "Status", "Created Date", "Priority"],
        database_rows: [
          { Name: "Review OAuth 2.0 Security Gateway", Status: "Done", "Created Date": "10/9/2024", Priority: "High" },
          { Name: "Deploy Server-Side Cache Layer", Status: "In Progress", "Created Date": "2/6/2026", Priority: "Medium" },
          { Name: "Write Client Integration Tests", Status: "Todo", "Created Date": "2/10/2026", Priority: "Low" },
        ]
      }
    ]
  },
  "mock-2": {
    title: "Product Launch Roadmap v2.0",
    emoji: "🚀",
    blocks: [
      { type: "heading_1", content: "🚀 Product Launch Roadmap v2.0" },
      { type: "paragraph", content: "Our team roadmap details the schedule leading to our official Q3 2026 release of Notion AI Workspace." },
      { type: "heading_2", content: "📅 Timeline Phases" },
      { type: "bulleted_list_item", content: "Phase 1 (Alpha): Core infrastructure build and basic page rendering" },
      { type: "bulleted_list_item", content: "Phase 2 (Beta): Support database views, filter criteria, and rich-text editing" },
      { type: "bulleted_list_item", content: "Phase 3 (Release): Public workspace distribution, team permissions, and billing" },
      { type: "heading_2", content: "💭 Release Quote" },
      { type: "quote", content: "A successful launch is the result of continuous design alignment and code discipline." }
    ]
  },
  "mock-3": {
    title: "Notion AI Integration Specifications",
    emoji: null,
    blocks: [
      { type: "heading_1", content: "📄 Notion AI Integration Specifications" },
      { type: "paragraph", content: "This technical spec details the structure and methods for querying the Notion block tree and mapping it to web components." },
      { type: "heading_2", content: "💻 Sample Typescript Definition" },
      { type: "code", content: `interface NotionSyncConfig {
  intervalMs: number;
  syncTypes: ('pages' | 'databases')[];
  maxDepth: number;
  encryptionKey: string;
}

export function syncWorkspace(config: NotionSyncConfig) {
  console.log("Synchronizing workspace...", config.intervalMs);
}`, language: "typescript" },
      { type: "paragraph", content: "We retrieve page children recursively from the Notion API to build a shadow document tree." }
    ]
  },
  "mock-4": {
    title: "Team Weekly Standup Sync Notes",
    emoji: "🎯",
    blocks: [
      { type: "heading_1", content: "🎯 Team Weekly Standup Sync Notes" },
      { type: "paragraph", content: "Meeting notes from July 10, 2026. Focus is on finalizing the UI design using shadcn components." },
      { type: "heading_2", content: "🗣️ Updates by Member" },
      { type: "bulleted_list_item", content: "Tommaso: Created the OAuth 2.0 flow and implemented the 3-day session cookies." },
      { type: "bulleted_list_item", content: "Sarah: Designed the sidebar navigation and updated style definitions to remove default serif font." },
      { type: "bulleted_list_item", content: "Next target: Complete dynamic sub-page rendering (read-only) inside the main panel." }
    ]
  },
  "mock-5": {
    title: "Marketing Copy & Creative Direction",
    emoji: "✍️",
    blocks: [
      { type: "heading_1", content: "✍️ Marketing Copy & Creative Direction" },
      { type: "paragraph", content: "A collection of drafts and directions for our landing pages and ad copies." },
      { type: "heading_2", content: "📣 Core Value Proposition" },
      { type: "quote", content: "Unlock the full potential of your Notion workspace. Retrieve, interact, and collaborate with your shared pages in a custom, secure AI-powered dashboard." }
    ]
  }
};
