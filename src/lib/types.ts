export interface Block {
  type: string;
  content: string;
  checked?: boolean;
  language?: string;
  table_width?: number;
  has_column_header?: boolean;
  rows?: any[][];
  database_title?: string;
  database_rows?: any[];
  database_columns?: string[];
  button_text?: string;
  button_icon?: string;
  caption?: string;
}

export interface Page {
  id: string;
  title: string;
  url: string;
  created: string;
  last_edited: string;
  emoji: string | null;
}
