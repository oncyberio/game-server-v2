import { OpenAI } from "openai";
const openai = new OpenAI();

const models = {
  openai: {
    "gpt-4o": "gpt-4o",
    "gpt-4o-mini": "gpt-4o-mini",
    "gpt-3.5-turbo": "gpt-3.5-turbo",
  },
};

const defaultModel = models.openai["gpt-4o-mini"];

function getModel(model: string) {
  //
  console.log("[Ai] getModel", process.env.OPENAI_API_KEY);
  if (model) {
    if (model in models.openai) {
      return model;
    }
  }

  return defaultModel;
}

export class Ai {
  //

  static async generateText(opts) {
    try {
      const completion = await openai.chat.completions.create({
        model: getModel(opts.model),
        messages: opts.messages,
      });
      const text = completion.choices[0].message.content;
      return text;
    } catch (error) {
      console.error(error.message);
      throw new Error(error.message.slice(0, 100));
    }
  }
}
