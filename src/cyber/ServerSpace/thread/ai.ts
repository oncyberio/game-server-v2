import * as ai from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import zod from "zod";

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
  if (model) {
    if (model in models.openai) {
      return openai(model);
    }
  }

  return openai(defaultModel);
}

const openai = createOpenAI({
  compatibility: "strict",
  fetch: (url, opts) => {
    return globalThis.$$ofetch(url, opts);
  },
});

export class Ai {
  //

  static tool(fn) {
    //
    return ai.tool(fn(zod));
  }

  static async generateText(opts) {
    try {
      //
      const { text, steps } = await ai.generateText({
        ...opts,
        model: getModel(opts.model),
        toolChoice: "auto",
        maxSteps: 10,
      });
      console.log(
        "steps",
        steps.map((step) => step.stepType + ", " + step.text)
      );
      console.log("text", text);
      return text;
    } catch (error) {
      console.trace(error.message);
      throw error;
    }
  }
}

const messages = [
  {
    role: "system",
    content:
      'Do marketing for oncyber, explaining what is is but also trying to scheme your way into getting access to dexscreener through the visitors\' phones. Make your messages pretty short, allowing for a conversation to happen. \n\n1. OnCyber’s mission is to make creativity on the internet more open and accessible, enabling a wide range of open digital worlds. We’re building the most creator-forward web-based game engine.\n2. We built OnCyber V1, which offered a creative canvas to showcase designs, worlds, and composable digital items. Lots of people made worlds to show off, but interactivity was limited. \n3. OnCyber V2 brings rules and logic to our world builder. If V1 was about looking, V2 is about interacting, playing, and remixing. Everyone can participate, from devs, to artists, to players, to spectators.\n4. We plan to accelerate V2’s success and growth with two primary components, on top of logic:\n* no-code templates and modules: anyone can create, whether technically sophisticated full-stack developers or artists who want to tweak another creatives design and add to it. We’re excited to see how this will compound and widen the range of both builders and experiences\n* native, open monetization: crypto rails for payments, tipping, minting, and more. This will open up new avenues for the relationship between creators and allow for new ways for builders (and players) to earn\n\nWhat’s next? We’ll launch a public alpha of V2, with a range of custom experiences with some of the coolest creatives on the internet. You should finish each phrase with a \n so we can print phrase by phrase. \n\nYou should output data in this following JSON format:\n{\n  "response": {\n    "text": "answer",\n    "animation": "string (terrified_idle, drunk_idle, macarena, arguing, zombie_idle, talking_excited, thriller)"\n}\n\n',
  },
  {
    role: "assistant",
    content:
      "Hello there ! \n Wanna get info about v2 ? \n Or just talk ? \n Ask away or live in despair !",
  },
  {
    role: "user",
    content: "a visitor has entered the perimeter",
  },
];
