import { createOpenAI } from '@ai-sdk/openai'; console.log(createOpenAI({ apiKey: 'test' }).chat('mimo').constructor.name);
