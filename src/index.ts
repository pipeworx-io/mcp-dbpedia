interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * DBpedia MCP — SPARQL + Lookup over Wikipedia-derived structured data
 *
 * Auth: none. Public endpoints.
 * Docs: https://www.dbpedia.org/resources/
 */


const LOOKUP = 'https://lookup.dbpedia.org/api/search';
const SPARQL = 'https://dbpedia.org/sparql';
const RES = 'https://dbpedia.org/data';
const UA = 'pipeworx-mcp-dbpedia/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'lookup',
    description: 'DBpedia Lookup search — find entities by label or alias.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        max_results: { type: 'number', description: '1-100 (default 10)' },
        type: { type: 'string', description: 'Restrict to a DBpedia type URI (e.g. Place, Person)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'sparql',
    description: 'Execute a SPARQL query against the DBpedia public endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SPARQL query text' },
        format: { type: 'string', description: 'json (default) | xml | csv | tsv' },
      },
      required: ['query'],
    },
  },
  {
    name: 'resource',
    description: 'Fetch all triples about a DBpedia resource.',
    inputSchema: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          description: 'Full resource URI (e.g. "http://dbpedia.org/resource/Albert_Einstein") or label (e.g. "Albert Einstein")',
        },
      },
      required: ['uri'],
    },
  },
  {
    name: 'abstract',
    description: 'Convenience: fetch the prose abstract for a topic.',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Topic label (e.g. "Eiffel Tower")' },
        lang: { type: 'string', description: 'ISO 639-1 language code (default en)' },
      },
      required: ['label'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'lookup': {
      const params = new URLSearchParams({
        query: reqStr(args, 'query', '"Einstein"'),
        maxResults: String(Math.min(100, Math.max(1, (args.max_results as number) ?? 10))),
        format: 'json',
      });
      if (args.type) params.set('typeName', String(args.type));
      const res = await fetch(`${LOOKUP}?${params}`, { headers: { Accept: 'application/json', 'User-Agent': UA } });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`DBpedia Lookup error: ${res.status} ${t.slice(0, 200)}`);
      }
      return res.json();
    }
    case 'sparql': {
      const format = (args.format as string) ?? 'json';
      const accept: Record<string, string> = {
        json: 'application/sparql-results+json',
        xml: 'application/sparql-results+xml',
        csv: 'text/csv',
        tsv: 'text/tab-separated-values',
      };
      const params = new URLSearchParams({
        query: reqStr(args, 'query', '"SELECT ?p WHERE { ?p a <http://dbpedia.org/ontology/Person> } LIMIT 5"'),
        format: accept[format] ?? accept.json,
      });
      const res = await fetch(`${SPARQL}?${params}`, {
        headers: { Accept: accept[format] ?? accept.json, 'User-Agent': UA },
      });
      if (res.status === 429) throw new Error('DBpedia SPARQL: rate-limit (HTTP 429)');
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`DBpedia SPARQL error: ${res.status} ${t.slice(0, 200)}`);
      }
      if ((accept[format] ?? accept.json) === accept.json) return res.json();
      return { format, body: await res.text() };
    }
    case 'resource': {
      const raw = reqStr(args, 'uri', '"Albert_Einstein"');
      const label = raw.startsWith('http') ? raw.split('/').pop()! : raw.replace(/\s+/g, '_');
      const res = await fetch(`${RES}/${encodeURIComponent(label)}.json`, {
        headers: { Accept: 'application/json', 'User-Agent': UA },
      });
      if (res.status === 404) throw new Error('DBpedia: resource not found');
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`DBpedia error: ${res.status} ${t.slice(0, 200)}`);
      }
      return res.json();
    }
    case 'abstract': {
      // DBpedia's live endpoint dropped dbo:abstract indexing during their
      // Databus migration. We fall back to Wikipedia's REST summary endpoint
      // for the prose text and only use DBpedia for the canonical entity URI.
      const label = reqStr(args, 'label', '"Eiffel Tower"').replace(/\s+/g, '_');
      const lang = (args.lang as string) ?? 'en';
      const wikiRes = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(label)}`,
        { headers: { Accept: 'application/json', 'User-Agent': UA } },
      );
      if (wikiRes.status === 404) {
        return { label: label.replace(/_/g, ' '), lang, abstract: null, note: 'Page not found on Wikipedia.' };
      }
      if (!wikiRes.ok) {
        const t = await wikiRes.text();
        throw new Error(`Wikipedia (abstract fallback) error: ${wikiRes.status} ${t.slice(0, 200)}`);
      }
      const data = (await wikiRes.json()) as { extract?: string; title?: string; content_urls?: { desktop?: { page?: string } } };
      return {
        label: data.title ?? label.replace(/_/g, ' '),
        lang,
        abstract: data.extract ?? null,
        source: data.content_urls?.desktop?.page,
        note: 'Sourced from Wikipedia REST summary (DBpedia live no longer indexes dbo:abstract).',
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function escapeUri(s: string): string {
  // DBpedia URIs use underscores; we accept either form. Just URI-encode unsafe bits.
  return s.replace(/[^A-Za-z0-9_-]/g, (c) => encodeURIComponent(c));
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
